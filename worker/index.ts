/** Cloudflare Worker entry point for MB Beauty. */
import handler from "vinext/server/app-router-entry";
import { calendarRoute, syncCalendar, type CalendarConfig } from "../lib/google-calendar/server";
import { shouldSyncAfterWrite } from "../lib/google-calendar/trigger";
import { deliverOwnerAlerts, ownerAlertRoute } from "../lib/owner-alerts/server";
import { customerBookingRoute } from "../lib/customer-booking";

interface Env extends CalendarConfig {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(deliverOwnerAlerts(env).catch(() => { console.warn("Owner alerts: retry pending"); }));
    ctx.waitUntil(syncCalendar(env).catch(() => { console.warn("Google Calendar: scheduled synchronization pending"); }));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/manage-booking") {
      const response=await customerBookingRoute(request,env);
      // Changes commit before synchronization; the existing cron retries failures.
      if (response.ok && response.headers.get("X-MB-Booking-Changed")==="1") {
        ctx.waitUntil(syncCalendar(env).catch(()=>{ console.warn("Google Calendar: customer change synchronization pending"); }));
        ctx.waitUntil(deliverOwnerAlerts(env).catch(()=>{ console.warn("Owner alerts: customer change delivery pending"); }));
      }
      return response;
    }
    if (url.pathname.startsWith("/api/owner-alerts/")) {
      const response = await ownerAlertRoute(request,env);
      if (request.method === "POST" && response.ok) ctx.waitUntil(deliverOwnerAlerts(env).catch(() => { console.warn("Owner alerts: retry pending"); }));
      return response;
    }
    if (url.pathname.startsWith("/api/google-calendar/")) return calendarRoute(request, env);
    const response = await handler.fetch(request, env, ctx);
    if (shouldSyncAfterWrite(request, response)) {
      ctx.waitUntil(deliverOwnerAlerts(env).catch(() => { console.warn("Owner alerts: retry pending"); }));
      ctx.waitUntil(syncCalendar(env).catch(() => { console.warn("Google Calendar: synchronization pending"); }));
    }
    return response;
  },
};

export default worker;
