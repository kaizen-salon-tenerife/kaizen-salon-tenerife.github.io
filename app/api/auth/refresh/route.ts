import {
  authCookie,
  getCurrentStaffRefreshToken,
  getStaffProfile,
  hasValidOrigin,
  STAFF_REFRESH_COOKIE,
  STAFF_SESSION_COOKIE,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string };
};

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const refreshToken = await getCurrentStaffRefreshToken();
  if (!refreshToken) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  try {
    const session = await supabaseRequest<AuthSession>(
      "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
    const profile = await getStaffProfile(session.user.id, session.access_token);
    if (!profile) {
      return Response.json({ error: "Esta cuenta no tiene acceso al panel." }, { status: 403 });
    }

    const secure = new URL(request.url).protocol === "https:";
    const headers = new Headers();
    headers.append("Set-Cookie", authCookie(
      STAFF_SESSION_COOKIE,
      session.access_token,
      session.expires_in,
      secure,
    ));
    headers.append("Set-Cookie", authCookie(
      STAFF_REFRESH_COOKIE,
      session.refresh_token,
      60 * 60 * 24 * 30,
      secure,
    ));
    return Response.json({ ok: true, mustChangePassword: profile.mustChangePassword }, { headers });
  } catch {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
}
