import { normalizeClientName, normalizeClientPhone } from "@/lib/client-identity";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type Profile = { professional_key: string };
type Client = {
  id: string; name: string; phone: string; email: string; notes: string;
  primary_professional_key: string; is_test: boolean;
};

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
    name?: string; phone?: string; email?: string; notes?: string; professionalId?: string;
  } | null;
  const name = normalizeClientName(payload?.name ?? "");
  const phone = normalizeClientPhone(payload?.phone ?? "");
  const email = payload?.email?.trim().toLowerCase().slice(0, 160) ?? "";
  if (name.length < 2) {
    return Response.json({ error: "Introduce el nombre de la clienta." }, { status: 400 });
  }
  if (!phone && !email) {
    return Response.json({ error: "Añade al menos un teléfono o correo." }, { status: 400 });
  }

  const professionalKey = user.role === "owner" ? payload?.professionalId ?? "" : user.id;
  if (!professionalKey) {
    return Response.json({ error: "Selecciona una profesional." }, { status: 400 });
  }
  const profiles = await supabaseRequest<Profile[]>(
    `/rest/v1/staff_profiles?professional_key=eq.${encodeURIComponent(professionalKey)}&is_active=eq.true&select=professional_key`,
    { accessToken },
  );
  if (!profiles.length) {
    return Response.json({ error: "La profesional seleccionada no está disponible." }, { status: 400 });
  }

  try {
    const rows = await supabaseRequest<Client[]>("/rest/v1/clients?select=*", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        phone,
        email,
        notes: payload?.notes?.trim().slice(0, 1200) ?? "",
        primary_professional_key: professionalKey,
        is_test: false,
      }),
    });
    const client = rows[0];
    await supabaseRequest("/rest/v1/client_professionals", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ client_id: client.id, professional_key: professionalKey }),
    });
    return Response.json({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        primaryProfessionalId: client.primary_professional_key,
        isTest: client.is_test,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "No se ha podido registrar la clienta." }, { status: 500 });
  }
}
