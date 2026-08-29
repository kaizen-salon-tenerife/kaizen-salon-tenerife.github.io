import { isPaymentMethod, isPaymentStatus, moneyToCents } from "@/lib/payment-values";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type Appointment = {
  id: string; client_id: string; professional_key: string; status: string;
};

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser(),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const payload = (await request.json().catch(() => null)) as {
    appointmentId?: string; amount?: string; discount?: string;
    method?: string; status?: string; notes?: string;
  } | null;
  const appointmentId = payload?.appointmentId ?? "";
  const amountCents = moneyToCents(payload?.amount);
  const discountCents = moneyToCents(payload?.discount || "0");
  const method = payload?.method;
  const status = payload?.status;
  if (
    !appointmentId || amountCents === null || discountCents === null ||
    !isPaymentMethod(method) || !isPaymentStatus(status)
  ) {
    return Response.json({ error: "Revisa los datos del cobro." }, { status: 400 });
  }
  const appointments = await supabaseRequest<Appointment[]>(
    `/rest/v1/appointments?id=eq.${encodeURIComponent(appointmentId)}&select=id,client_id,professional_key,status`,
    { accessToken },
  );
  const appointment = appointments[0];
  if (!appointment) {
    return Response.json({ error: "No tienes acceso a esa cita." }, { status: 404 });
  }
  if (appointment.status !== "completed") {
    return Response.json({
      error: "El cobro solo puede registrarse cuando la cita haya terminado.",
    }, { status: 409 });
  }
  try {
    await supabaseRequest("/rest/v1/payments", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointment.id,
        client_id: appointment.client_id,
        professional_key: appointment.professional_key,
        amount_cents: amountCents,
        discount_cents: discountCents,
        method,
        status,
        notes: payload?.notes?.trim().slice(0, 400) ?? "",
        recorded_by: user.authId,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      }),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se ha podido registrar el cobro." }, { status: 409 });
  }
}
