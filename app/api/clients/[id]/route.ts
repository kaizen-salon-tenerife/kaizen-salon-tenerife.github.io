import { normalizeClientName, normalizeClientPhone } from "@/lib/client-identity";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRawRequest, supabaseRequest } from "@/lib/supabase";

type ExistingClient = {
  id: string; primary_professional_key: string; blocked_at: string | null;
};

export async function PATCH(
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
  const existingRows = await supabaseRequest<ExistingClient[]>(
    `/rest/v1/clients?id=eq.${encodeURIComponent(id)}&select=id,primary_professional_key,blocked_at`,
    { accessToken },
  );
  const existing = existingRows[0];
  if (!existing) {
    return Response.json({ error: "No tienes acceso a esta ficha." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string; phone?: string; email?: string; notes?: string;
    professionalId?: string; isBlocked?: boolean; blockReason?: string;
  } | null;
  const name = normalizeClientName(payload?.name ?? "");
  const phone = normalizeClientPhone(payload?.phone ?? "");
  const email = payload?.email?.trim().toLowerCase().slice(0, 160) ?? "";
  const isBlocked = Boolean(payload?.isBlocked);
  const blockReason = isBlocked ? payload?.blockReason?.trim().slice(0, 600) ?? "" : "";
  if (name.length < 2) {
    return Response.json({ error: "Introduce el nombre de la clienta." }, { status: 400 });
  }
  if (!phone && !email) {
    return Response.json({ error: "Añade al menos un teléfono o correo." }, { status: 400 });
  }
  if (isBlocked && blockReason.length < 3) {
    return Response.json({ error: "Escribe el motivo del bloqueo." }, { status: 400 });
  }

  const professionalKey = user.role === "owner" && payload?.professionalId
    ? payload.professionalId
    : existing.primary_professional_key;
  try {
    await supabaseRequest(`/rest/v1/clients?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        notes: payload?.notes?.trim().slice(0, 1200) ?? "",
        primary_professional_key: professionalKey,
        is_blocked: isBlocked,
        block_reason: blockReason,
        blocked_at: isBlocked ? existing.blocked_at ?? new Date().toISOString() : null,
      }),
    });
    await supabaseRequest("/rest/v1/client_professionals", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ client_id: id, professional_key: professionalKey }),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se ha podido modificar la ficha." }, { status: 500 });
  }
}

export async function DELETE(
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
  try {
    const records = await supabaseRequest<Array<{ id: string }>>(
      `/rest/v1/treatment_records?client_id=eq.${encodeURIComponent(id)}&select=id`,
      { accessToken },
    );
    if (records.length) {
      const recordIds = records.map((record) => record.id).join(",");
      const photos = await supabaseRequest<Array<{ object_path: string }>>(
        `/rest/v1/treatment_photos?treatment_record_id=in.(${recordIds})&select=object_path`,
        { accessToken },
      );
      const deletions = await Promise.all(photos.map((photo) => supabaseRawRequest(
        `/storage/v1/object/treatment-photos/${photo.object_path.split("/").map(encodeURIComponent).join("/")}`,
        { method: "DELETE", accessToken },
      )));
      if (deletions.some((response) => !response.ok && response.status !== 404)) {
        return Response.json(
          { error: "No se han podido eliminar las fotografías privadas." },
          { status: 500 },
        );
      }
    }
    const deleted = await supabaseRequest<Array<{ id: string }>>(
      `/rest/v1/clients?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        method: "DELETE",
        accessToken,
        headers: { Prefer: "return=representation" },
      },
    );
    if (!deleted.length) {
      return Response.json({ error: "No tienes acceso a esta ficha." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se ha podido eliminar la ficha." }, { status: 500 });
  }
}
