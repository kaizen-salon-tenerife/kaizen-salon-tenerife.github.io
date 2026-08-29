export const SUPABASE_URL = "https://gwndpaeebjtoowuzkywz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1A6k0kdx24V0KQfNQBSS0Q_w_8losSi";

type SupabaseRequestOptions = RequestInit & { accessToken?: string };

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { accessToken, headers, ...requestOptions } = options;
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
      ...headers,
    },
    cache: "no-store",
  });

  const result = (await response.json().catch(() => null)) as T | {
    message?: string;
    msg?: string;
    error_description?: string;
  } | null;

  if (!response.ok) {
    const detail = result && typeof result === "object"
      ? result.message ?? result.msg ?? result.error_description
      : null;
    throw new Error(detail ?? `Supabase respondió con ${response.status}.`);
  }
  return result as T;
}

export async function supabaseRawRequest(
  path: string,
  options: SupabaseRequestOptions = {},
) {
  const { accessToken, headers, ...requestOptions } = options;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
      ...headers,
    },
    cache: "no-store",
  });
}
