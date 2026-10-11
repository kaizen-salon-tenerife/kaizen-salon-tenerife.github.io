/** Cloudflare Worker entry point for MB Beauty. */
import handler from "vinext/server/app-router-entry";
import { calendarRoute, syncCalendar, type CalendarConfig } from "../lib/google-calendar/server";

interface Env extends CalendarConfig {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(syncCalendar(env).catch(() => { console.warn("Google Calendar: scheduled synchronization pending"); }));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/google-calendar/")) return calendarRoute(request, env);
    const response = await handler.fetch(request, env, ctx);
    if (url.origin === "https://mb-beauty.leonforge.workers.dev" && response.ok && ["POST", "PATCH"].includes(request.method) && url.pathname.startsWith("/api/appointments")) {
      ctx.waitUntil(syncCalendar(env).catch(() => { console.warn("Google Calendar: synchronization pending"); }));
    }
    return response;
  },
};

export default worker;
