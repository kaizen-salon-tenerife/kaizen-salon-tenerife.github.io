export const STUDIO_OPENING_MINUTE = 9 * 60;
export const STUDIO_CLOSING_MINUTE = 19 * 60;

export const MB_BEAUTY_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null,
  1: { start: STUDIO_OPENING_MINUTE, end: STUDIO_CLOSING_MINUTE },
  2: { start: STUDIO_OPENING_MINUTE, end: STUDIO_CLOSING_MINUTE },
  3: { start: STUDIO_OPENING_MINUTE, end: STUDIO_CLOSING_MINUTE },
  4: { start: STUDIO_OPENING_MINUTE, end: STUDIO_CLOSING_MINUTE },
  5: { start: STUDIO_OPENING_MINUTE, end: STUDIO_CLOSING_MINUTE },
  6: null,
};

export function addMinutes(localDateTime: string, minutes: number) {
  const date = new Date(`${localDateTime}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 19);
}

export function isWithinOpeningHours(startsAt: string, endsAt: string) {
  const date = new Date(`${startsAt.slice(0, 10)}T12:00:00Z`);
  const hours = MB_BEAUTY_HOURS[date.getUTCDay()];
  if (!hours || startsAt.slice(0, 10) !== endsAt.slice(0, 10)) return false;

  const startMinutes = timeToMinutes(startsAt.slice(11, 16));
  const endMinutes = timeToMinutes(endsAt.slice(11, 16));
  return startMinutes >= hours.start && endMinutes <= hours.end && endMinutes > startMinutes;
}

export function isValidLocalDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value);
}

export function isWithinStaffAppointmentHours(startsAt: string, endsAt: string, user: { role: string; professionalKey: string }, professionalKey: string) {
  if (isWithinOpeningHours(startsAt, endsAt)) return true;
  const saturday = new Date(`${startsAt.slice(0, 10)}T12:00:00Z`).getUTCDay() === 6;
  return saturday && user.role === "owner" && user.professionalKey === "nurme" && professionalKey === "nurme"
    && startsAt.slice(0, 10) === endsAt.slice(0, 10)
    && timeToMinutes(startsAt.slice(11, 16)) >= STUDIO_OPENING_MINUTE
    && timeToMinutes(endsAt.slice(11, 16)) <= STUDIO_CLOSING_MINUTE
    && endsAt > startsAt;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
