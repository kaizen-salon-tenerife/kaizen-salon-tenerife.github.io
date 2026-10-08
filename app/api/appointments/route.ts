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

type Client = { id: string; primary_professional_key: string };
type Appointment = {
  id: string; client_id: string; professional_key: string; service_name: string;
  starts_at: string; ends_at: string; status: string; notes: string;
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
    clientId?: string; professionalId?: string; serviceName?: string;
    date?: string; time?: string; duration?: number; notes?: string;
  } | null;
  const clientId = payload?.clientId ?? "";
  const professionalKey = user.role === "owner" ? payload?.professionalId ?? "" : user.id;
  const serviceName = payload?.serviceName?.trim().slice(0, 240) ?? "";
  const date = payload?.date ?? "";
  const time = payload?.time ?? "";
  const duration = Number(payload?.duration ?? 0);
  if (
    !clientId || !professionalKey || !serviceName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isQuarterHour(time) ||
    duration < 15 || duration > 480
  ) {
    return Response.json({ error: "Revisa los datos de la cita." }, { status: 400 });
  }

  const clients = await supabaseRequest<Client[]>(
    `/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=id,primary_professional_key`,
    { accessToken },
  );
  if (!clients.length) {
    return Response.json({ error: "No tienes acceso a esa clienta." }, { status: 403 });
  }
  if (!(await isActiveProfessional(accessToken, professionalKey))) {
    return Response.json({ error: "La profesional seleccionada no está disponible." }, { status: 400 });
  }

  const startsAt = `${date}T${time}:00`;
  const endsAt = addMinutes(startsAt, duration);
  if (!isWithinOpeningHours(startsAt, endsAt)) {
    return Response.json({ error: "La cita debe estar dentro del horario de MB Beauty." }, { status: 400 });
  }
  const conflict = await hasAppointmentConflict({
    accessToken, professionalKey, startsAt, endsAt,
  });
  if (conflict.appointment) {
    return Response.json({ error: "Ese horario se cruza con otra cita." }, { status: 409 });
  }
  if (conflict.block) {
    return Response.json({ error: "La profesional tiene ese horario bloqueado." }, { status: 409 });
  }

  try {
    await supabaseRequest("/rest/v1/client_professionals", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ client_id: clientId, professional_key: professionalKey }),
    });
    const rows = await supabaseRequest<Appointment[]>("/rest/v1/appointments?select=*", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        client_id: clientId,
        professional_key: professionalKey,
        service_name: serviceName,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "confirmed",
        notes: payload?.notes?.trim().slice(0, 600) ?? "",
      }),
    });
    const appointment = rows[0];
    return Response.json({
      appointment: {
        id: appointment.id,
        clientId: appointment.client_id,
        professionalId: appointment.professional_key,
        serviceName: appointment.service_name,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        notes: appointment.notes,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Ese horario acaba de ocuparse. Elige otro." }, { status: 409 });
  }
}
