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
  if (url.pathname === "/rest/v1/staff_profiles") return Response.json([profile]);
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
    assert.match(html, /MB Beauty/);
    assert.match(html, /Administración operativa/);
    assert.match(html, /Administrador técnico principal y superadministrador/);
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
    assert.match(html, /Administrador técnico principal/);
    await mkdir("outputs", { recursive: true });
    await writeFile("outputs/admin-preview.html", html);
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

test("public reservation retains availability check and existing RPC payload", async () => {
  const availability = await request("/api/availability?date=2099-10-08&services=manicure-tradicional&professional=nurme");
  assert.equal(availability.status, 200);
  const { slots } = await availability.json();
  assert.ok(slots.length > 0);
  const response = await request("/api/booking-requests", "POST", { requestId: "00000000-0000-4000-8000-000000000001", serviceIds: [service.id], preferredProfessional: "nurme", startsAt: slots[0].startsAt, name: "Prueba local", phone: "600000000", privacyAccepted: true, waitlist: false }, "");
  assert.equal(response.status, 201);
  assert.equal((await response.json()).reference, "fixture-booking");
});

test("logout calls Auth and clears persistent session cookies", async () => {
  calls.length = 0;
  const response = await request("/api/auth/logout", "POST");
  assert.equal(response.status, 200);
  assert.ok(calls.some((call) => call.path === "/auth/v1/logout"));
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
