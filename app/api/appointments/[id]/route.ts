import {
  hasAppointmentConflict,
  isActiveProfessional,
  isQuarterHour,
} from "@/lib/appointment-access";
import { addMinutes, isWithinOpeningHours } from "@/lib/schedule";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
type AppointmentStatus = (typeof statuses)[number];
type Appointment = {
  id: string; client_id: string; professional_key: string; service_name: string;
  starts_at: string; ends_at: string; status: AppointmentStatus; status_reason: string;
  completed_at: string | null; notes: string; booking_request_id: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
  const { id } = await context.params;
  const rows = await supabaseRequest<Appointment[]>(
    `/rest/v1/appointments?id=eq.${encodeURIComponent(id)}&select=*`,
    { accessToken },
  );
  const existing = rows[0];
  if (!existing) {
    return Response.json({ error: "No tienes acceso a esa cita." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as {
    clientId?: string; professionalId?: string; serviceName?: string;
    date?: string; time?: string; duration?: number; status?: AppointmentStatus;
    statusReason?: string; notes?: string;
  } | null;
  const clientId = payload?.clientId ?? existing.client_id;
  const professionalKey = user.role === "owner"
    ? payload?.professionalId ?? existing.professional_key
    : user.id;
  const serviceName = payload?.serviceName?.trim().slice(0, 240) ?? existing.service_name;
  const date = payload?.date ?? existing.starts_at.slice(0, 10);
  const time = payload?.time ?? existing.starts_at.slice(11, 16);
  const duration = Number(payload?.duration ?? minutesBetween(existing.starts_at, existing.ends_at));
  const status = payload?.status ?? existing.status;
  const statusReason = payload?.statusReason?.trim().slice(0, 240) ?? existing.status_reason;
  const notes = payload?.notes?.trim().slice(0, 600) ?? existing.notes;
  const blocksAvailability = status === "pending" || status === "confirmed";
  if (
    !clientId || !professionalKey || !serviceName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isQuarterHour(time) ||
    duration < 15 || duration > 480 || !statuses.includes(status)
  ) {
    return Response.json({ error: "Revisa los datos de la cita." }, { status: 400 });
  }
  if ((status === "cancelled" || status === "no_show") && !statusReason) {
    return Response.json({ error: "Indica el motivo de la cancelación o de la ausencia." }, { status: 400 });
  }
  if (status === "completed" && existing.status !== "completed") {
    return Response.json({ error: "Finaliza la cita desde el botón verde y completa su ficha." }, { status: 400 });
  }

  const clients = await supabaseRequest<Array<{ id: string }>>(
    `/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=id`,
    { accessToken },
  );
  if (!clients.length || !(await isActiveProfessional(accessToken, professionalKey))) {
    return Response.json({ error: "No tienes acceso a esa clienta o profesional." }, { status: 403 });
  }
  const startsAt = `${date}T${time}:00`;
  const endsAt = addMinutes(startsAt, duration);
  if (blocksAvailability && !isWithinOpeningHours(startsAt, endsAt)) {
    return Response.json({ error: "La cita debe estar dentro del horario de Kaizen." }, { status: 400 });
  }
  if (blocksAvailability) {
    const conflict = await hasAppointmentConflict({
      accessToken, professionalKey, startsAt, endsAt, excludingId: id,
    });
    if (conflict.appointment) {
      return Response.json({ error: "Ese horario se cruza con otra cita." }, { status: 409 });
    }
    if (conflict.block) {
      return Response.json({ error: "La profesional tiene ese horario bloqueado." }, { status: 409 });
    }
  }

  try {
    await supabaseRequest("/rest/v1/client_professionals", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ client_id: clientId, professional_key: professionalKey }),
    });
    await supabaseRequest(`/rest/v1/appointments?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        professional_key: professionalKey,
        service_name: serviceName,
        starts_at: startsAt,
        ends_at: endsAt,
        status,
        status_reason: status === "cancelled" || status === "no_show" ? statusReason : "",
        completed_at: status === "completed"
          ? existing.completed_at ?? new Date().toISOString()
          : null,
        notes,
        hold_expires_at: null,
      }),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Ese horario acaba de ocuparse. Elige otro." }, { status: 409 });
  }
}

function minutesBetween(start: string, end: string) {
  return Math.round((new Date(`${end}Z`).getTime() - new Date(`${start}Z`).getTime()) / 60000);
}
