import { formatServiceDuration } from "@/lib/service-definitions";
import {
  mapService,
  type SupabaseService,
} from "@/lib/service-catalog";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser(),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || user.role !== "owner" || !accessToken) {
    return Response.json(
      { error: "Tu cuenta no tiene permiso para modificar los servicios." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    durationMinutes?: number;
    priceLabel?: string;
    isActive?: boolean;
  } | null;
  const durationMinutes = Number(payload?.durationMinutes ?? 0);
  const priceLabel = payload?.priceLabel?.trim().slice(0, 40) ?? "";
  const isActive = payload?.isActive;
  if (
    !Number.isInteger(durationMinutes) || durationMinutes < 15 ||
    durationMinutes > 480 || durationMinutes % 15 !== 0 ||
    priceLabel.length < 1 || typeof isActive !== "boolean"
  ) {
    return Response.json(
      { error: "Selecciona una duración válida en bloques de 15 minutos." },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const rows = await supabaseRequest<SupabaseService[]>(
      `/rest/v1/services?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: "PATCH",
        accessToken,
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          duration_minutes: durationMinutes,
          duration_label: `${formatServiceDuration(durationMinutes)} aprox.`,
          price_label: priceLabel,
          is_active: isActive,
        }),
      },
    );
    if (!rows.length) {
      return Response.json({ error: "Servicio no encontrado." }, { status: 404 });
    }
    return Response.json({ service: mapService(rows[0]) });
  } catch {
    return Response.json(
      { error: "No se ha podido actualizar el servicio." },
      { status: 500 },
    );
  }
}
