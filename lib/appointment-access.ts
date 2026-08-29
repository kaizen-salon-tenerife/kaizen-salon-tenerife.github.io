import { supabaseRequest } from "@/lib/supabase";

export function isQuarterHour(value: string) {
  return /^([01]\d|2[0-3]):(00|15|30|45)$/.test(value);
}

export async function hasAppointmentConflict({
  accessToken,
  professionalKey,
  startsAt,
  endsAt,
  excludingId,
}: {
  accessToken: string;
  professionalKey: string;
  startsAt: string;
  endsAt: string;
  excludingId?: string;
}) {
  const appointmentParams = new URLSearchParams({
    select: "id",
    professional_key: `eq.${professionalKey}`,
    status: "in.(pending,confirmed)",
    starts_at: `lt.${endsAt}`,
    ends_at: `gt.${startsAt}`,
  });
  if (excludingId) appointmentParams.set("id", `neq.${excludingId}`);
  const blockParams = new URLSearchParams({
    select: "id",
    starts_at: `lt.${endsAt}`,
    ends_at: `gt.${startsAt}`,
    or: `(professional_key.eq.${professionalKey},professional_key.is.null)`,
  });
  const [appointments, blocks] = await Promise.all([
    supabaseRequest<Array<{ id: string }>>(`/rest/v1/appointments?${appointmentParams}`, { accessToken }),
    supabaseRequest<Array<{ id: string }>>(`/rest/v1/schedule_blocks?${blockParams}`, { accessToken }),
  ]);
  return { appointment: appointments.length > 0, block: blocks.length > 0 };
}

export async function isActiveProfessional(accessToken: string, professionalKey: string) {
  const rows = await supabaseRequest<Array<{ professional_key: string }>>(
    `/rest/v1/staff_profiles?professional_key=eq.${encodeURIComponent(professionalKey)}&is_active=eq.true&select=professional_key`,
    { accessToken },
  );
  return rows.length > 0;
}
