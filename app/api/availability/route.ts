import {
  BookingAvailabilityError,
  calculateBookingAvailability,
  isValidBookingProfessional,
} from "@/lib/booking-availability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const serviceIds = (url.searchParams.get("services") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 12);
  const preferredProfessional = url.searchParams.get("professional") ?? "any";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    serviceIds.length === 0 ||
    !isValidBookingProfessional(preferredProfessional)
  ) {
    return Response.json(
      { error: "Selecciona una fecha y al menos un servicio." },
      { status: 400 },
    );
  }

  try {
    const result = await calculateBookingAvailability({
      date,
      serviceIds,
      preferredProfessional,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof BookingAvailabilityError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
