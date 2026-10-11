/** Only successful writes on the official site can trigger calendar synchronization. */
export function shouldSyncAfterWrite(request: Request, response: Response) {
  const url = new URL(request.url);
  return url.origin === "https://mb-beauty.leonforge.workers.dev"
    && response.ok
    && ["POST", "PATCH"].includes(request.method)
    && (url.pathname === "/api/booking-requests"
      || /^\/api\/appointments(?:\/[0-9a-f-]+(?:\/complete)?)?$/.test(url.pathname));
}
