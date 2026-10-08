import {
  BookingAvailabilityError,
  calculateBookingAvailability,
  isValidBookingProfessional,
} from "@/lib/booking-availability";
import {
  normalizeClientName,
  normalizeClientPhone,
} from "@/lib/client-identity";
import { hasValidOrigin } from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type BookingResult = {
  ok: boolean;
  reference: string;
  appointmentCount?: number;
  alreadySaved?: boolean;
};

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const payload = (await request.json().catch(() => null)) as {
    requestId?: string;
    serviceIds?: string[];
    preferredProfessional?: string;
    startsAt?: string;
    name?: string;
    phone?: string;
    notes?: string;
    waitlist?: boolean;
    privacyAccepted?: boolean;
  } | null;
  const requestId = payload?.requestId ?? "";
  const serviceIds = Array.isArray(payload?.serviceIds)
    ? [...new Set(payload.serviceIds)].slice(0, 12)
    : [];
  const preferredProfessional = payload?.preferredProfessional ?? "any";
  const startsAt = payload?.startsAt ?? "";
  const name = normalizeClientName(payload?.name ?? "");
  const phone = normalizeClientPhone(payload?.phone ?? "");
  const notes = payload?.notes?.trim().slice(0, 400) ?? "";
  const waitlist = Boolean(payload?.waitlist);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
    serviceIds.length === 0 ||
    !isValidBookingProfessional(preferredProfessional) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(startsAt) ||
    name.length < 2 ||
    phone.replace(/\D/g, "").length < 9 ||
    payload?.privacyAccepted !== true
  ) {
    return Response.json(
      { error: "Revisa tus datos, los servicios y la hora seleccionada." },
      { status: 400 },
    );
  }

  try {
    const availability = await calculateBookingAvailability({
      date: startsAt.slice(0, 10),
      serviceIds,
      preferredProfessional,
    });
    if (!availability.slots.some((slot) => slot.startsAt === startsAt)) {
      return Response.json(
        {
          error: "Esa hora acaba de dejar de estar disponible. Vuelve al calendario y elige otra.",
          code: "slot_unavailable",
        },
        { status: 409 },
      );
    }

    const result = await supabaseRequest<BookingResult>(
      "/rest/v1/rpc/create_public_booking",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_request_id: requestId,
          p_service_ids: serviceIds,
          p_preferred_professional: preferredProfessional,
          p_starts_at: startsAt,
          p_name: name,
          p_phone: phone,
          p_notes: notes,
          p_waitlist: waitlist,
          p_privacy_version: "2026-10-08",
        }),
      },
    );
    return Response.json(result, { status: result.alreadySaved ? 200 : 201 });
  } catch (error) {
    if (error instanceof BookingAvailabilityError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("client_blocked")) {
      return Response.json(
        {
          error: "No es posible realizar la reserva online con estos datos. Contacta directamente con MB Beauty.",
          code: "client_blocked",
        },
        { status: 403 },
      );
    }
    return Response.json(
      {
        error: "Esa hora acaba de ocuparse. Vuelve al calendario para elegir otra.",
        code: "slot_unavailable",
      },
      { status: 409 },
    );
  }
}
