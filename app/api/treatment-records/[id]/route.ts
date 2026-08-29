import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type RecordRow = {
  id: string; appointment_id: string; client_id: string; professional_key: string;
  result_notes: string; treatment_details: string; photo_authorized: boolean;
  photo_decline_reason: string; aftercare_provided: boolean; incident_occurred: boolean;
  incident_notes: string; next_recommended_date: string | null; created_at: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser(),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const { id } = await context.params;
  const rows = await supabaseRequest<RecordRow[]>(
    `/rest/v1/treatment_records?id=eq.${encodeURIComponent(id)}&select=*`,
    { accessToken },
  );
  const record = rows[0];
  if (!record) {
    return Response.json({ error: "No tienes acceso a esta ficha." }, { status: 404 });
  }
  const [appointments, clients, profiles, photos] = await Promise.all([
    supabaseRequest<Array<{ service_name: string; starts_at: string }>>(
      `/rest/v1/appointments?id=eq.${record.appointment_id}&select=service_name,starts_at`,
      { accessToken },
    ),
    supabaseRequest<Array<{ name: string }>>(
      `/rest/v1/clients?id=eq.${record.client_id}&select=name`,
      { accessToken },
    ),
    supabaseRequest<Array<{ display_name: string }>>(
      `/rest/v1/staff_profiles?professional_key=eq.${record.professional_key}&select=display_name`,
      { accessToken },
    ),
    supabaseRequest<Array<{ id: string; kind: "before" | "after" }>>(
      `/rest/v1/treatment_photos?treatment_record_id=eq.${record.id}&select=id,kind`,
      { accessToken },
    ),
  ]);
  return Response.json({
    record: {
      id: record.id,
      appointmentId: record.appointment_id,
      client: clients[0]?.name ?? "Clienta",
      service: appointments[0]?.service_name ?? "Tratamiento",
      professional: profiles[0]?.display_name ?? record.professional_key,
      startsAt: appointments[0]?.starts_at ?? record.created_at,
      resultNotes: record.result_notes,
      treatmentDetails: record.treatment_details,
      photoAuthorized: record.photo_authorized,
      photoDeclineReason: record.photo_decline_reason,
      aftercareProvided: record.aftercare_provided,
      incidentOccurred: record.incident_occurred,
      incidentNotes: record.incident_notes,
      nextRecommendedDate: record.next_recommended_date,
      createdAt: record.created_at,
      photos: photos.map((photo) => ({
        ...photo,
        url: `/api/treatment-photos/${photo.id}`,
      })),
    },
  });
}
