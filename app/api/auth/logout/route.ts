import {
  clearAuthCookies,
  getCurrentStaffAccessToken,
  hasValidOrigin,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const accessToken = await getCurrentStaffAccessToken();
  if (accessToken) {
    await supabaseRequest("/auth/v1/logout", {
      method: "POST",
      accessToken,
    }).catch(() => null);
  }
  const headers = new Headers();
  for (const cookie of clearAuthCookies(new URL(request.url).protocol === "https:")) {
    headers.append("Set-Cookie", cookie);
  }
  return Response.json({ ok: true }, { headers });
}
