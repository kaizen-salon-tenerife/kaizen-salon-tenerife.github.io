import {
  buildConsecutiveSegments,
  generateAvailableSlots,
  getCanaryLocalDateTime,
  type BusyInterval,
} from "@/lib/availability";
import { KAIZEN_HOURS } from "@/lib/schedule";
import { getServiceCatalog } from "@/lib/service-catalog";
import { supabaseRequest } from "@/lib/supabase";

export const BOOKING_PROFESSIONAL_KEYS = ["sarai", "yeroha", "nurme"] as const;

const PROFESSIONALS = new Map([
  ["sarai", { id: "sarai", name: "Sarai", professionalKey: "sarai" }],
  ["yeroha", { id: "yeroha", name: "Yeroha", professionalKey: "yeroha" }],
  ["nurme", { id: "nurme", name: "Nurme", professionalKey: "nurme" }],
]);

type BusyRow = {
  professional_key: string;
  starts_at: string;
  ends_at: string;
};

export class BookingAvailabilityError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function isValidBookingProfessional(value: string) {
  return value === "any" || BOOKING_PROFESSIONAL_KEYS.includes(
    value as (typeof BOOKING_PROFESSIONAL_KEYS)[number],
  );
}

export async function calculateBookingAvailability({
  date,
  serviceIds,
  preferredProfessional,
}: {
  date: string;
  serviceIds: string[];
  preferredProfessional: string;
}) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!KAIZEN_HOURS[weekday]) {
    return {
      slots: [],
      totalDuration: 0,
      reason: "closed",
      message: "MB Beauty permanece cerrado los domingos. Elige otro día.",
      professionals: [],
      selectedServices: [],
    };
  }

  const catalog = await getServiceCatalog();
  const byId = new Map(catalog.map((service) => [service.id, service]));
  const selectedServices = serviceIds
    .map((id) => byId.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service?.isActive));

  if (selectedServices.length !== serviceIds.length) {
    throw new BookingAvailabilityError("Alguno de los servicios ya no está disponible.");
  }

  const requiredKeys = new Set(selectedServices.map((service) => service.professionalKey));
  if (
    preferredProfessional !== "any" &&
    (requiredKeys.size !== 1 || !requiredKeys.has(preferredProfessional))
  ) {
    throw new BookingAvailabilityError(
      "Esa profesional no realiza todos los servicios elegidos. Selecciona asignación automática.",
    );
  }

  const segments = buildConsecutiveSegments(selectedServices, PROFESSIONALS);
  if (!segments) {
    return {
      slots: [],
      totalDuration: selectedServices.reduce(
        (total, service) => total + service.durationMinutes,
        0,
      ),
      reason: "professional_unavailable",
      message: "Una de las profesionales necesarias no está disponible. Contacta con MB Beauty.",
      professionals: [],
      selectedServices,
    };
  }

  const professionalKeys = [...new Set(segments.map((segment) => segment.professionalId))];
  const busyRows = await supabaseRequest<BusyRow[]>(
    "/rest/v1/rpc/booking_busy_intervals",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_date: date,
        p_professional_keys: professionalKeys,
      }),
    },
  );
  const busyByProfessional = new Map<string, BusyInterval[]>();
  for (const busy of busyRows) {
    const intervals = busyByProfessional.get(busy.professional_key) ?? [];
    intervals.push({ startsAt: busy.starts_at, endsAt: busy.ends_at });
    busyByProfessional.set(busy.professional_key, intervals);
  }

  const slots = generateAvailableSlots({
    date,
    segments,
    busyByProfessional,
    nowLocal: getCanaryLocalDateTime(),
  });
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );

  return {
    slots,
    totalDuration,
    reason: slots.length ? null : "no_availability",
    message: slots.length
      ? null
      : "No quedan horas seguidas suficientes para estos servicios en ese día. Prueba otra fecha.",
    professionals: segments.map((segment) => ({
      key: segment.professionalKey,
      id: segment.professionalId,
      name: segment.professionalName,
      serviceNames: segment.serviceNames,
      durationMinutes: segment.durationMinutes,
    })),
    selectedServices,
  };
}
