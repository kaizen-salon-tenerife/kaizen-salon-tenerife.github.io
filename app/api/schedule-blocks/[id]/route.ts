import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

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
  const params = new URLSearchParams({ id: `eq.${id}`, select: "id" });
  if (user.role !== "owner") params.set("professional_key", `eq.${user.id}`);
  const deleted = await supabaseRequest<Array<{ id: string }>>(
    `/rest/v1/schedule_blocks?${params}`,
    {
      method: "DELETE",
      accessToken,
      headers: { Prefer: "return=representation" },
    },
  );
  if (!deleted.length) {
    return Response.json({ error: "No tienes acceso a ese bloqueo." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
