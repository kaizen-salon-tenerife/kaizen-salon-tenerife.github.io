export const KAIZEN_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null,
  1: { start: 9 * 60 + 30, end: 18 * 60 },
  2: { start: 9 * 60 + 30, end: 18 * 60 },
  3: { start: 9 * 60 + 30, end: 18 * 60 },
  4: { start: 9 * 60 + 30, end: 18 * 60 },
  5: { start: 9 * 60 + 30, end: 18 * 60 },
  6: { start: 9 * 60 + 30, end: 13 * 60 + 30 },
};

export function addMinutes(localDateTime: string, minutes: number) {
  const date = new Date(`${localDateTime}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 19);
}

export function isWithinOpeningHours(startsAt: string, endsAt: string) {
  const date = new Date(`${startsAt.slice(0, 10)}T12:00:00Z`);
  const hours = KAIZEN_HOURS[date.getUTCDay()];
  if (!hours || startsAt.slice(0, 10) !== endsAt.slice(0, 10)) return false;

  const startMinutes = timeToMinutes(startsAt.slice(11, 16));
  const endMinutes = timeToMinutes(endsAt.slice(11, 16));
  return startMinutes >= hours.start && endMinutes <= hours.end && endMinutes > startMinutes;
}

export function isValidLocalDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
