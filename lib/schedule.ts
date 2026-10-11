export const MB_BEAUTY_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null,
  1: { start: 9 * 60 + 30, end: 18 * 60 },
  2: { start: 9 * 60 + 30, end: 18 * 60 },
  3: { start: 9 * 60 + 30, end: 18 * 60 },
  4: { start: 9 * 60 + 30, end: 18 * 60 },
  5: { start: 9 * 60 + 30, end: 18 * 60 },
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
    && timeToMinutes(startsAt.slice(11, 16)) >= 9 * 60 + 30
    && timeToMinutes(endsAt.slice(11, 16)) <= 18 * 60
    && endsAt > startsAt;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
