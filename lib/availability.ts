import { addMinutes, MB_BEAUTY_HOURS } from "@/lib/schedule";

export type BusyInterval = {
  startsAt: string;
  endsAt: string;
};

export type AvailabilitySegment = {
  professionalKey: string;
  professionalId: string;
  professionalName: string;
  durationMinutes: number;
  serviceNames: string[];
};

export type AvailableSlot = {
  time: string;
  startsAt: string;
  endsAt: string;
  schedule: Array<{
    professionalKey: string;
    professionalName: string;
    startsAt: string;
    endsAt: string;
    serviceNames: string[];
  }>;
};

export function buildConsecutiveSegments(
  services: Array<{
    name: string;
    durationMinutes: number;
    professionalKey: string;
  }>,
  professionals: Map<
    string,
    { id: string; name: string; professionalKey: string }
  >,
) {
  const segments: AvailabilitySegment[] = [];

  for (const service of services) {
    const professional = professionals.get(service.professionalKey);
    if (!professional) return null;

    const previous = segments.at(-1);
    if (previous?.professionalKey === service.professionalKey) {
      previous.durationMinutes += service.durationMinutes;
      previous.serviceNames.push(service.name);
      continue;
    }

    segments.push({
      professionalKey: service.professionalKey,
      professionalId: professional.id,
      professionalName: professional.name,
      durationMinutes: service.durationMinutes,
      serviceNames: [service.name],
    });
  }

  return segments;
}

export function generateAvailableSlots({
  date,
  segments,
  busyByProfessional,
  nowLocal,
}: {
  date: string;
  segments: AvailabilitySegment[];
  busyByProfessional: Map<string, BusyInterval[]>;
  nowLocal: string;
}) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const openingHours = MB_BEAUTY_HOURS[weekday];
  if (!openingHours) return [];

  const totalDuration = segments.reduce(
    (total, segment) => total + segment.durationMinutes,
    0,
  );
  const slots: AvailableSlot[] = [];

  for (
    let startMinute = openingHours.start;
    startMinute + totalDuration <= openingHours.end;
    startMinute += 15
  ) {
    const startsAt = `${date}T${minutesToTime(startMinute)}:00`;
    if (startsAt <= nowLocal) continue;

    let cursor = startsAt;
    const schedule: AvailableSlot["schedule"] = [];
    let isAvailable = true;

    for (const segment of segments) {
      const endsAt = addMinutes(cursor, segment.durationMinutes);
      const busyIntervals =
        busyByProfessional.get(segment.professionalId) ?? [];
      const overlaps = busyIntervals.some(
        (busy) => busy.startsAt < endsAt && busy.endsAt > cursor,
      );

      if (overlaps) {
        isAvailable = false;
        break;
      }

      schedule.push({
        professionalKey: segment.professionalKey,
        professionalName: segment.professionalName,
        startsAt: cursor,
        endsAt,
        serviceNames: segment.serviceNames,
      });
      cursor = endsAt;
    }

    if (isAvailable) {
      slots.push({
        time: startsAt.slice(11, 16),
        startsAt,
        endsAt: cursor,
        schedule,
      });
    }
  }

  return slots;
}

export function getCanaryLocalDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}:${value.second}`;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
