import { cookies } from "next/headers";
import { supabaseRequest } from "@/lib/supabase";

export const STAFF_SESSION_COOKIE = "kaizen_access_token";
export const STAFF_REFRESH_COOKIE = "kaizen_refresh_token";

export type StaffUser = {
  id: string;
  authId: string;
  email: string;
  name: string;
  role: "owner" | "professional";
  professionalKey: string;
  mustChangePassword: boolean;
};

type SupabaseAuthUser = { id: string; email?: string };
type StaffProfile = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "professional";
  professional_key: string;
  is_active: boolean;
  must_change_password: boolean;
};

export async function getCurrentStaffAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(STAFF_SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentStaffRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(STAFF_REFRESH_COOKIE)?.value ?? null;
}

export async function getCurrentStaffUser(options: { allowPasswordChange?: boolean } = {}): Promise<StaffUser | null> {
  const accessToken = await getCurrentStaffAccessToken();
  if (!accessToken) return null;
  try {
    const authUser = await supabaseRequest<SupabaseAuthUser>("/auth/v1/user", {
      accessToken,
    });
    const profile = await getStaffProfile(authUser.id, accessToken);
    if (profile?.mustChangePassword && !options.allowPasswordChange) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function getStaffProfile(userId: string, accessToken: string) {
  const profiles = await supabaseRequest<StaffProfile[]>(
    `/rest/v1/staff_profiles?id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=id,email,display_name,role,professional_key,is_active,must_change_password`,
    { accessToken },
  );
  const profile = profiles[0];
  if (!profile) return null;

  return {
    id: profile.professional_key,
    authId: profile.id,
    email: profile.email,
    name: profile.display_name,
    role: profile.role === "professional" ? "professional" : "owner",
    professionalKey: profile.professional_key,
    mustChangePassword: profile.must_change_password,
  } satisfies StaffUser;
}

export function authCookie(name: string, value: string, maxAge: number, secure: boolean) {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ].filter(Boolean).join("; ");
}

export function clearAuthCookies(secure: boolean) {
  return [
    authCookie(STAFF_SESSION_COOKIE, "", 0, secure),
    authCookie(STAFF_REFRESH_COOKIE, "", 0, secure),
  ];
}

export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export function passwordValidationMessage(password: string) {
  if (password.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Incluye una letra mayúscula y una minúscula.";
  }
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Incluye un número y un símbolo.";
  }
  return null;
}
