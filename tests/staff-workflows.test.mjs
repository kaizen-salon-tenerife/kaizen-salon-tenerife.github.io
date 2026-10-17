import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";

// All Supabase requests are intercepted in this process. No real credentials,
// authentication, database writes or changes to production accounts occur.
const profile = { id: "fixture-user", email: "fixture@example.invalid", display_name: "Nurme Martín", role: "professional", professional_key: "nurme", is_active: true, must_change_password: false };
const service = { id: "manicure-tradicional", name: "Manicura tradicional", category: "Manicura y uñas", duration_minutes: 30, duration_label: "30 min aprox.", price_label: "20 €", professional_key: "nurme", is_active: true, sort_order: 20 };
const appointment = { id: "fixture-appointment", client_id: "fixture-client", professional_key: "nurme", service_name: "Manicura tradicional", starts_at: "2099-10-08T10:00:00", ends_at: "2099-10-08T10:30:00", status: "confirmed", notes: "", status_reason: "", completed_at: null, booking_request_id: null };
const client = { id: "fixture-client", name: "Clienta de prueba", phone: "", email: "", notes: "", primary_professional_key: "nurme", is_test: true, is_blocked: false, block_reason: "", blocked_at: null };
let conflict = false;
let hiddenAppointment = false;
const calls = [];
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  assert.ok(url.hostname.endsWith(".supabase.co"), "Unexpected external request blocked");
  calls.push({ path: url.pathname, params: url.searchParams, method: options.method ?? "GET", payload: options.body ? JSON.parse(options.body) : null, headers: options.headers });
  if (url.pathname === "/auth/v1/token") return Response.json({ access_token: "fixture-access", refresh_token: "fixture-refresh", expires_in: 3600, user: { id: profile.id } });
  // Deliberately misleading metadata must never determine authorization.
  if (url.pathname === "/auth/v1/user") return Response.json({ id: profile.id, email: profile.email, user_metadata: { role: "owner" } });
  if (url.pathname === "/auth/v1/logout") return Response.json({});
  if (url.pathname === "/rest/v1/staff_profiles") return Response.json(url.searchParams.get("is_active") === "eq.true" && !profile.is_active ? [] : [profile]);
  if (url.pathname === "/rest/v1/services") return Response.json([service]);
  if (url.pathname === "/rest/v1/clients") return Response.json([client]);
  if (url.pathname === "/rest/v1/appointments") {
    if (options.method === "POST" || options.method === "PATCH") return Response.json([appointment]);
    if (url.searchParams.get("select") === "id") return Response.json(conflict ? [{ id: "busy" }] : []);
    if (hiddenAppointment) return Response.json([]);
    return Response.json([appointment]);
  }
  if (url.pathname === "/rest/v1/client_professionals") return Response.json([]);
  if (url.pathname === "/rest/v1/rpc/booking_busy_intervals") return Response.json([]);
  if (url.pathname === "/rest/v1/rpc/create_public_booking") return Response.json({ ok: true, reference: "fixture-booking", appointmentCount: 1 });
  if (["schedule_blocks", "booking_requests", "treatment_records", "payments", "whatsapp_notifications"].some((table) => url.pathname === `/rest/v1/${table}`)) return Response.json([]);
  throw new Error(`Unmocked request blocked: ${url.pathname}`);
};
// Vinext captures fetch when its module initializes; install mocks first.
const { default: worker } = await import("../dist/server/index.js");
const env = { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
function request(path, method = "GET", payload, cookie = "mb_beauty_access_token=fixture-access; mb_beauty_refresh_token=fixture-refresh") {
  return worker.fetch(new Request(`http://localhost${path}`, { method, headers: { origin: "http://localhost", cookie, "Content-Type": "application/json" }, ...(payload ? { body: JSON.stringify(payload) } : {}) }), env, ctx);
}
const booking = { clientId: client.id, professionalId: "sarai", serviceName: service.name, date: "2099-10-08", time: "10:00", duration: 30, notes: "" };

test("login and refresh retain protected session cookies (mock Supabase)", async () => {
  for (const path of ["/api/auth/login", "/api/auth/refresh"]) {
    const response = await request(path, "POST", { email: profile.email, password: "fixture-only" });
    assert.equal(response.status, 200);
    const cookies = response.headers.get("set-cookie");
    assert.match(cookies, /mb_beauty_access_token=fixture-access/);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /SameSite=Strict/);
  }
});

test("persisted session renders Nurme's agenda and responsibility labels", async () => {
  for (let i = 0; i < 2; i++) {
    const response = await request("/panel");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /MB Nurme Beauty/);
    assert.match(html, /Propietaria/);
    assert.match(html, /Manuel · Administrador/);
    assert.doesNotMatch(html, /superadministrador|migración de acceso/);
    assert.match(html, /Agenda/);
    assert.doesNotMatch(html, /logo-kaizen|Kaizen/);
    if (i === 0) { await mkdir("outputs", { recursive: true }); await writeFile("outputs/panel-preview.html", html); }
  }
});

test("Manuel's administrative panel retains historical staff workflows", async () => {
  const original = { ...profile };
  Object.assign(profile, { professional_key: "adminleon", role: "admin", display_name: "Manuel" });
  try {
    const response = await request("/panel");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Clientes|Clientas/);
    assert.match(html, /Agenda/);
    assert.match(html, /Citas pendientes/);
    assert.match(html, /Servicios/);
    assert.match(html, /Administrador/);
    await mkdir("outputs", { recursive: true });
    await writeFile("outputs/admin-preview.html", html);
  } finally { Object.assign(profile, original); }
});

test("Nurme's owner profile unlocks management and inactive staff cannot access the panel", async () => {
  const original = { ...profile };
  try {
    profile.role = "owner";
    const response = await request("/panel");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Resumen/);
    assert.match(html, /Equipo/);
    assert.match(html, /Propietaria/);
    assert.doesNotMatch(html, /superadministrador|migración de acceso/);
    Object.assign(profile, { professional_key: "sarai", is_active: false });
    const denied = await request("/panel");
    assert.equal(denied.status, 307);
    assert.match(denied.headers.get("location"), /panel\/acceso/);
    assert.equal((await request("/api/services/manicure-tradicional", "PATCH", { priceLabel: "25 €", durationMinutes: 30, isActive: true })).status, 403);
  } finally { Object.assign(profile, original); }
});

test("first-access session still redirects to required password change", async () => {
  profile.must_change_password = true;
  try {
    const response = await request("/panel");
    assert.equal(response.status, 307);
    assert.match(response.headers.get("location"), /cambiar-clave/);
  } finally { profile.must_change_password = false; }
});

test("appointment creation preserves staff-profile authorization, ignoring editable metadata", async () => {
  calls.length = 0;
  const response = await request("/api/appointments", "POST", booking);
  assert.equal(response.status, 201);
  const write = calls.find((call) => call.path === "/rest/v1/appointments" && call.method === "POST");
  assert.equal(write.payload.professional_key, "nurme");
  assert.equal(write.headers.Authorization, "Bearer fixture-access");
});

test("overlapping appointments are rejected before a database write", async () => {
  calls.length = 0; conflict = true;
  try {
    const response = await request("/api/appointments", "POST", booking);
    assert.equal(response.status, 409);
    assert.ok(!calls.some((call) => call.path === "/rest/v1/appointments" && call.method === "POST"));
  } finally { conflict = false; }
});

test("panel appointments preserve multiple service names and quarter-hour durations", async () => {
  const names = ["Manicura tradicional", "Pedicura", "Higiene facial", "Tratamiento personalizado ".repeat(10)].join(" + ");
  for (const duration of [75, 105]) {
    calls.length = 0;
    assert.equal((await request("/api/appointments", "POST", { ...booking, serviceName: names, duration })).status, 201);
    const write = calls.find((call) => call.path === "/rest/v1/appointments" && call.method === "POST");
    assert.equal(write.payload.service_name, names.trim());
    assert.equal(write.payload.ends_at, duration === 75 ? "2099-10-08T11:15:00" : "2099-10-08T11:45:00");
  }
});

test("appointment editing continues to use authenticated user's professional key", async () => {
  calls.length = 0;
  const response = await request("/api/appointments/fixture-appointment", "PATCH", { ...booking, notes: "Edición simulada" });
  assert.equal(response.status, 200);
  const write = calls.find((call) => call.path === "/rest/v1/appointments" && call.method === "PATCH");
  assert.equal(write.payload.professional_key, "nurme");
});

test("appointments hidden by RLS cannot be edited", async () => {
  hiddenAppointment = true;
  try { assert.equal((await request("/api/appointments/hidden", "PATCH", booking)).status, 404); }
  finally { hiddenAppointment = false; }
});

test("cancellation requires a reason and preserves the appointment history", async () => {
  calls.length = 0;
  assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", { status: "cancelled", statusReason: "" })).status, 400);
  assert.ok(!calls.some((call) => call.path === "/rest/v1/appointments" && call.method === "PATCH"));
  assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", { status: "cancelled", statusReason: "La clienta solicitó cancelar" })).status, 200);
  const write = calls.find((call) => call.path === "/rest/v1/appointments" && call.method === "PATCH");
  assert.equal(write.payload.status, "cancelled");
  assert.equal(write.payload.status_reason, "La clienta solicitó cancelar");
  assert.equal(write.payload.hold_expires_at, null);
  assert.ok(!calls.some((call) => call.method === "DELETE"));
});

test("cancelled appointments disappear from the agenda time grid", async () => {
  const previousStatus = appointment.status;
  try {
    appointment.status = "confirmed";
    // Bring the fixture into the displayed week without changing stored data.
    const today = new Date();
    today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const originalStart = appointment.starts_at, originalEnd = appointment.ends_at;
    try {
      appointment.starts_at = `${date}T10:00:00`;
      appointment.ends_at = `${date}T10:30:00`;
      assert.match(await (await request("/panel")).text(), /class="calendar-event calendar-appointment/);
      appointment.status = "cancelled";
      assert.doesNotMatch(await (await request("/panel")).text(), /class="calendar-event calendar-appointment/);
    } finally { appointment.starts_at = originalStart; appointment.ends_at = originalEnd; }
  } finally { appointment.status = previousStatus; }
});

test("public reservation retains availability check and existing RPC payload", async () => {
  const availability = await request("/api/availability?date=2099-10-08&services=manicure-tradicional&professional=nurme");
  assert.equal(availability.status, 200);
  const { slots } = await availability.json();
  assert.ok(slots.length > 0);
  const response = await request("/api/booking-requests", "POST", { requestId: "00000000-0000-4000-8000-000000000001", serviceIds: [service.id], preferredProfessional: "nurme", startsAt: slots[0].startsAt, name: "Prueba local", phone: "600000000", privacyAccepted: true, waitlist: false }, "");
  assert.equal(response.status, 201);
  assert.equal((await response.json()).reference, "fixture-booking");
});

test("Saturday is closed publicly and only Nurme can create or reschedule exceptions", async () => {
  const original = { ...profile };
  const saturday = { ...booking, professionalId: "nurme", date: "2099-10-10" };
  try {
    const availability = await request("/api/availability?date=2099-10-10&services=manicure-tradicional&professional=nurme");
    assert.equal(availability.status, 200);
    const result = await availability.json();
    assert.deepEqual(result.slots, []);
    assert.equal(result.reason, "closed");
    assert.match(result.message, /sábados/);
    calls.length = 0;
    const publicBooking = await request("/api/booking-requests", "POST", { requestId: "00000000-0000-4000-8000-000000000001", serviceIds: [service.id], preferredProfessional: "nurme", startsAt: "2099-10-10T10:00:00", name: "Prueba", phone: "600000000", privacyAccepted: true });
    assert.equal(publicBooking.status, 409);
    assert.ok(!calls.some(call => call.path === "/rest/v1/rpc/create_public_booking"));
    profile.role = "owner";
    assert.equal((await request("/api/appointments", "POST", saturday)).status, 201);
    assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", saturday)).status, 200);
    Object.assign(profile, { professional_key: "adminleon", role: "admin" });
    calls.length = 0;
    assert.equal((await request("/api/appointments", "POST", saturday)).status, 400);
    assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", saturday)).status, 400);
    assert.ok(!calls.some(call => call.path === "/rest/v1/appointments" && ["POST", "PATCH"].includes(call.method)));
    Object.assign(profile, { professional_key: "nurme", role: "owner" });
    assert.equal((await request("/api/appointments", "POST", { ...saturday, date: "2099-10-11" })).status, 400);
  } finally { Object.assign(profile, original); }
});

test("public and staff booking use 09:00–19:00 and require the whole treatment to fit", async () => {
  const response = await request("/api/availability?date=2099-10-08&services=manicure-tradicional&professional=nurme");
  const { slots } = await response.json();
  assert.equal(slots[0].startsAt, "2099-10-08T09:00:00");
  assert.equal(slots.at(-1).startsAt, "2099-10-08T18:30:00");
  for (const time of ["09:00", "18:30"]) {
    assert.equal((await request("/api/appointments", "POST", { ...booking, time })).status, 201);
    assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", { ...booking, time })).status, 200);
    assert.equal((await request("/api/booking-requests", "POST", { requestId: "00000000-0000-4000-8000-000000000001", serviceIds: [service.id], preferredProfessional: "nurme", startsAt: `2099-10-08T${time}:00`, name: "Prueba", phone: "600000000", privacyAccepted: true })).status, 201);
  }
  assert.equal((await request("/api/appointments", "POST", { ...booking, time: "18:45", duration: 15 })).status, 201);
  for (const time of ["08:45", "18:45", "19:00"]) {
    assert.equal((await request("/api/appointments", "POST", { ...booking, time })).status, 400);
    assert.equal((await request("/api/appointments/fixture-appointment", "PATCH", { ...booking, time })).status, 400);
    calls.length = 0;
    assert.equal((await request("/api/booking-requests", "POST", { requestId: "00000000-0000-4000-8000-000000000001", serviceIds: [service.id], preferredProfessional: "nurme", startsAt: `2099-10-08T${time}:00`, name: "Prueba", phone: "600000000", privacyAccepted: true })).status, 409);
    assert.ok(!calls.some(call => call.path === "/rest/v1/rpc/create_public_booking"));
  }
});

test("logout calls Auth and clears persistent session cookies", async () => {
  calls.length = 0;
  const response = await request("/api/auth/logout", "POST");
  assert.equal(response.status, 200);
  assert.ok(calls.some((call) => call.path === "/auth/v1/logout"));
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});

test("Nurme can save her service prices and durations with her professional account", async () => {
  calls.length = 0;
  const response = await request(`/api/services/${service.id}`, "PATCH", { durationMinutes: 45, priceLabel: "23 €", isActive: true });
  assert.equal(response.status, 200);
  const write = calls.find(call => call.path === "/rest/v1/services" && call.method === "PATCH");
  assert.equal(write.payload.price_label, "23 €");
  assert.equal(write.payload.duration_minutes, 45);
  assert.equal(write.headers.Authorization, "Bearer fixture-access");
});

test("service editing rejects other professionals and Nurme editing another catalog", async () => {
  const originalProfile = { ...profile };
  const originalKey = service.professional_key;
  const payload = { durationMinutes: 30, priceLabel: "20 €", isActive: true };
  try {
    profile.professional_key = "yeroha";
    calls.length = 0;
    assert.equal((await request(`/api/services/${service.id}`, "PATCH", payload)).status, 403);
    assert.ok(!calls.some(call => call.method === "PATCH"));
    Object.assign(profile, originalProfile);
    service.professional_key = "yeroha";
    calls.length = 0;
    assert.equal((await request(`/api/services/${service.id}`, "PATCH", payload)).status, 403);
    assert.ok(!calls.some(call => call.method === "PATCH"));
  } finally {
    Object.assign(profile, originalProfile);
    service.professional_key = originalKey;
  }
});
