import {
  authCookie,
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
  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = payload?.email?.trim().toLowerCase() ?? "";
  const password = payload?.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Introduce el correo y la contraseña." }, { status: 400 });
  }

  try {
    const session = await supabaseRequest<AuthSession>(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    const profile = await getStaffProfile(session.user.id, session.access_token);
    if (!profile) {
      return Response.json(
        { error: "Esta cuenta no tiene acceso al panel de Kaizen." },
        { status: 403 },
      );
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
    return Response.json(
      { error: "El correo o la contraseña no son correctos." },
      { status: 401 },
    );
  }
}
