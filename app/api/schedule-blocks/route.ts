import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { isValidLocalDateTime, isWithinOpeningHours } from "@/lib/schedule";
import { supabaseRequest } from "@/lib/supabase";

type BlockRow = {
  id: string; professional_key: string | null; title: string;
  starts_at: string; ends_at: string; is_all_day: boolean;
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
    professionalId?: string; title?: string; startDate?: string; endDate?: string;
    startTime?: string; endTime?: string; allDay?: boolean; scope?: "professional" | "center";
  } | null;
  const centerWide = user.role === "owner" && payload?.scope === "center";
  const professionalKey = centerWide
    ? null
    : user.role === "owner" ? payload?.professionalId ?? "" : user.id;
  const title = payload?.title?.trim().slice(0, 80) ?? "";
  const startDate = payload?.startDate ?? "";
  const endDate = payload?.endDate || startDate;
  const allDay = Boolean(payload?.allDay);
  const startsAt = allDay
    ? `${startDate}T00:00:00`
    : `${startDate}T${payload?.startTime ?? ""}:00`;
  const endsAt = allDay
    ? `${addOneDay(endDate)}T00:00:00`
    : `${endDate}T${payload?.endTime ?? ""}:00`;

  if (
    (!professionalKey && !centerWide) || !title || (centerWide && !allDay) ||
    !isValidLocalDateTime(startsAt) || !isValidLocalDateTime(endsAt) ||
    endsAt <= startsAt || (!allDay && !isWithinOpeningHours(startsAt, endsAt))
  ) {
    return Response.json({
      error: allDay
        ? "Revisa las fechas del bloqueo."
        : "El bloqueo debe estar dentro del horario de MB Beauty.",
    }, { status: 400 });
  }

  const appointmentParams = new URLSearchParams({
    select: "id",
    status: "in.(pending,confirmed)",
    starts_at: `lt.${endsAt}`,
    ends_at: `gt.${startsAt}`,
  });
  if (professionalKey) appointmentParams.set("professional_key", `eq.${professionalKey}`);
  const blockParams = new URLSearchParams({
    select: "id",
    starts_at: `lt.${endsAt}`,
    ends_at: `gt.${startsAt}`,
  });
  blockParams.set(
    "or",
    centerWide
      ? "(professional_key.is.null)"
      : `(professional_key.eq.${professionalKey},professional_key.is.null)`,
  );

  const [appointmentOverlap, blockOverlap] = await Promise.all([
    supabaseRequest<Array<{ id: string }>>(`/rest/v1/appointments?${appointmentParams}`, { accessToken }),
    supabaseRequest<Array<{ id: string }>>(`/rest/v1/schedule_blocks?${blockParams}`, { accessToken }),
  ]);
  if (appointmentOverlap.length) {
    return Response.json({
      error: centerWide
        ? "Hay citas en ese día. Reprográmalas o cancélalas antes de cerrar el centro."
        : "Ya existe una cita en ese periodo. Modifícala o cancélala antes.",
    }, { status: 409 });
  }
  if (blockOverlap.length) {
    return Response.json({ error: "Ese periodo ya está bloqueado." }, { status: 409 });
  }

  try {
    const rows = await supabaseRequest<BlockRow[]>("/rest/v1/schedule_blocks?select=*", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        professional_key: professionalKey,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        is_all_day: allDay,
        created_by: user.authId,
      }),
    });
    const block = rows[0];
    return Response.json({
      block: {
        id: block.id,
        professionalId: block.professional_key,
        title: block.title,
        startsAt: block.starts_at,
        endsAt: block.ends_at,
        isAllDay: block.is_all_day,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "No se ha podido bloquear ese horario." }, { status: 500 });
  }
}
function addOneDay(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
