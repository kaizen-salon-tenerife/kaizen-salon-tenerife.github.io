import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

const kinds = ["confirmation", "reminder", "waitlist"] as const;
const actions = ["opened", "sent"] as const;
type Notification = { id: string; status: "opened" | "sent" };

export async function POST(request: Request) {
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
  const payload = (await request.json().catch(() => null)) as {
    appointmentId?: string; kind?: (typeof kinds)[number]; slotKey?: string;
    message?: string; action?: (typeof actions)[number];
  } | null;
  const appointmentId = payload?.appointmentId ?? "";
  const kind = payload?.kind;
  const slotKey = payload?.slotKey?.trim().slice(0, 32) ?? "";
  const message = payload?.message?.trim().slice(0, 1200) ?? "";
  const action = payload?.action;
  if (
    !appointmentId || !kind || !kinds.includes(kind) ||
    !action || !actions.includes(action) || !message
  ) {
    return Response.json({ error: "Revisa los datos del mensaje." }, { status: 400 });
  }

  const appointments = await supabaseRequest<Array<{ id: string }>>(
    `/rest/v1/appointments?id=eq.${encodeURIComponent(appointmentId)}&select=id`,
    { accessToken },
  );
  if (!appointments.length) {
    return Response.json({ error: "No tienes acceso a esa cita." }, { status: 404 });
  }
  const params = new URLSearchParams({
    appointment_id: `eq.${appointmentId}`,
    kind: `eq.${kind}`,
    slot_key: `eq.${slotKey}`,
    select: "id,status",
  });
  const existingRows = await supabaseRequest<Notification[]>(
    `/rest/v1/whatsapp_notifications?${params}`,
    { accessToken },
  );
  const existing = existingRows[0];
  const now = new Date().toISOString();
  const status = action === "sent" || existing?.status === "sent" ? "sent" : "opened";
  if (existing) {
    await supabaseRequest(`/rest/v1/whatsapp_notifications?id=eq.${existing.id}`, {
      method: "PATCH",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, status, sent_at: status === "sent" ? now : null }),
    });
  } else {
    await supabaseRequest("/rest/v1/whatsapp_notifications", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        kind,
        slot_key: slotKey,
        message,
        status,
        opened_at: now,
        sent_at: status === "sent" ? now : null,
        created_by: user.authId,
      }),
    });
  }
  return Response.json({ ok: true, status });
}
