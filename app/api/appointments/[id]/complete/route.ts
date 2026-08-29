import { isPaymentMethod, isPaymentStatus, moneyToCents } from "@/lib/payment-values";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRawRequest, supabaseRequest } from "@/lib/supabase";
import {
  MAX_TREATMENT_PHOTO_BYTES,
  treatmentPhotoPath,
} from "@/lib/treatment-storage";

const acceptedPhotoTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
]);
type Appointment = {
  id: string; client_id: string; professional_key: string; status: string;
};
type UploadedPhoto = {
  id: string; kind: "before" | "after"; object_path: string;
  content_type: string; size_bytes: number;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
  const { id } = await context.params;
  const rows = await supabaseRequest<Appointment[]>(
    `/rest/v1/appointments?id=eq.${encodeURIComponent(id)}&select=id,client_id,professional_key,status`,
    { accessToken },
  );
  const appointment = rows[0];
  if (!appointment) {
    return Response.json({ error: "No tienes acceso a esa cita." }, { status: 404 });
  }
  if (appointment.status !== "confirmed") {
    return Response.json({ error: "Solo se puede cerrar una cita confirmada." }, { status: 409 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return Response.json({ error: "No se ha podido leer la ficha." }, { status: 400 });
  }
  const resultNotes = textValue(form, "resultNotes", 600);
  const treatmentDetails = textValue(form, "treatmentDetails", 600);
  const photoAuthorization = String(form.get("photoAuthorization") ?? "");
  const photoDeclineReason = textValue(form, "photoDeclineReason", 240);
  const aftercareProvided = form.get("aftercareProvided") === "true";
  const incidentOccurred = form.get("incidentOccurred") === "true";
  const incidentNotes = textValue(form, "incidentNotes", 400);
  const nextRecommendedDate = textValue(form, "nextRecommendedDate", 10);
  const beforePhoto = photoValue(form, "beforePhoto");
  const afterPhoto = photoValue(form, "afterPhoto");
  const paymentAmountCents = moneyToCents(form.get("paymentAmount"));
  const paymentDiscountCents = moneyToCents(form.get("paymentDiscount") || "0");
  const paymentMethod = form.get("paymentMethod");
  const paymentStatus = form.get("paymentStatus");

  if (resultNotes.length < 2) {
    return Response.json({ error: "Escribe brevemente cómo quedó el tratamiento." }, { status: 400 });
  }
  if (photoAuthorization !== "authorized" && photoAuthorization !== "declined") {
    return Response.json({ error: "Indica si la clienta autoriza las fotografías." }, { status: 400 });
  }
  if (photoAuthorization === "declined" && photoDeclineReason.length < 2) {
    return Response.json({ error: "Añade una nota breve sobre la no autorización." }, { status: 400 });
  }
  if (incidentOccurred && incidentNotes.length < 2) {
    return Response.json({ error: "Describe brevemente la incidencia." }, { status: 400 });
  }
  if (nextRecommendedDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextRecommendedDate)) {
    return Response.json({ error: "Revisa la fecha recomendada." }, { status: 400 });
  }
  if (
    paymentAmountCents === null || paymentDiscountCents === null ||
    !isPaymentMethod(paymentMethod) || !isPaymentStatus(paymentStatus)
  ) {
    return Response.json({ error: "Revisa el importe y la forma de pago." }, { status: 400 });
  }

  const photos = photoAuthorization === "authorized"
    ? ([
        ["before", beforePhoto],
        ["after", afterPhoto],
      ] as const).filter((item): item is readonly ["before" | "after", File] => Boolean(item[1]))
    : [];
  for (const [, file] of photos) {
    if (!acceptedPhotoTypes.has(file.type)) {
      return Response.json({ error: "Las fotos deben ser JPG, PNG, WEBP, HEIC o HEIF." }, { status: 400 });
    }
    if (file.size > MAX_TREATMENT_PHOTO_BYTES) {
      return Response.json({ error: "Cada fotografía puede ocupar como máximo 10 MB." }, { status: 400 });
    }
  }

  const recordId = crypto.randomUUID();
  const uploaded: UploadedPhoto[] = [];
  try {
    for (const [kind, file] of photos) {
      const objectPath = treatmentPhotoPath({
        professionalKey: appointment.professional_key,
        clientId: appointment.client_id,
        recordId,
        kind,
        file,
      });
      const upload = await supabaseRawRequest(
        `/storage/v1/object/treatment-photos/${encodePath(objectPath)}`,
        {
          method: "POST",
          accessToken,
          headers: { "Content-Type": file.type, "x-upsert": "false" },
          body: file,
        },
      );
      if (!upload.ok) throw new Error("Photo upload failed");
      uploaded.push({
        id: crypto.randomUUID(),
        kind,
        object_path: objectPath,
        content_type: file.type,
        size_bytes: file.size,
      });
    }

    const result = await supabaseRequest<{ ok: boolean; recordId: string }>(
      "/rest/v1/rpc/complete_staff_appointment",
      {
        method: "POST",
        accessToken,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_appointment_id: appointment.id,
          p_record_id: recordId,
          p_result_notes: resultNotes,
          p_treatment_details: treatmentDetails,
          p_photo_authorized: photoAuthorization === "authorized",
          p_photo_decline_reason: photoDeclineReason,
          p_aftercare_provided: aftercareProvided,
          p_incident_occurred: incidentOccurred,
          p_incident_notes: incidentNotes,
          p_next_recommended_date: nextRecommendedDate || null,
          p_payment_amount_cents: paymentAmountCents,
          p_payment_discount_cents: paymentDiscountCents,
          p_payment_method: paymentMethod,
          p_payment_status: paymentStatus,
          p_payment_notes: textValue(form, "paymentNotes", 400),
          p_photos: uploaded,
        }),
      },
    );
    return Response.json(result);
  } catch {
    await Promise.allSettled(uploaded.map((photo) => supabaseRawRequest(
      `/storage/v1/object/treatment-photos/${encodePath(photo.object_path)}`,
      { method: "DELETE", accessToken },
    )));
    return Response.json({ error: "No se ha podido guardar la ficha. Inténtalo de nuevo." }, { status: 500 });
  }
}

function textValue(form: FormData, key: string, max: number) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function photoValue(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
