let refreshInFlight: Promise<boolean> | null = null;

/** Coalesce refreshes so parallel panel requests do not rotate the same token twice. */
export function refreshStaffSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/** A 401 is returned before a panel write; retry only after renewing its session. */
export async function staffFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401 || !(await refreshStaffSession())) return response;
  return fetch(input, init);
}
