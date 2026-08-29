import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
  hasValidOrigin,
  passwordValidationMessage,
} from "@/lib/staff-auth";
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser({ allowPasswordChange: true }),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const payload = (await request.json().catch(() => null)) as {
    password?: string;
    confirmation?: string;
  } | null;
  const password = payload?.password ?? "";
  const confirmation = payload?.confirmation ?? "";
  const validationError = passwordValidationMessage(password);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }
  if (password !== confirmation) {
    return Response.json({ error: "Las dos contraseñas no coinciden." }, { status: 400 });
  }

  try {
    await supabaseRequest("/auth/v1/user", {
      method: "PUT",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await supabaseRequest("/rest/v1/rpc/mark_staff_password_changed", {
      method: "POST",
      accessToken,
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "No se ha podido actualizar la contraseña." },
      { status: 500 },
    );
  }
}
