import { CALENDAR_SCOPE, eventId, projectEvent, shouldPublish, type CalendarAppointment } from "./projection";

export type CalendarConfig = {
  GOOGLE_CALENDAR_ENABLED?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALENDAR_ENCRYPTION_KEY?: string; SUPABASE_SECRET_KEY?: string;
};
const ORIGIN = "https://mb-beauty.leonforge.workers.dev";
const CALLBACK = ORIGIN + "/api/google-calendar/callback";
const DB = "https://gwndpaeebjtoowuzkywz.supabase.co";
const COOKIE = "mb_google_connect";
type Connection = { id: string; calendar_id: string | null; refresh_token: string | null; cursor: string; cursor_id: string | null; nonce: string | null; nonce_expires_at: string | null; connected_by: string | null; lease_until: string; last_synced_at: string | null; last_error: string | null };
export function configured(env: CalendarConfig) {
  return env.GOOGLE_CALENDAR_ENABLED === "true" && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET && !!env.SUPABASE_SECRET_KEY && /^[0-9a-f]{64}$/i.test(env.GOOGLE_CALENDAR_ENCRYPTION_KEY ?? "");
}
function encode(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decode(value: string) { return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0)); }
async function key(env: CalendarConfig) {
  const value = env.GOOGLE_CALENDAR_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Calendar encryption is not configured");
  return crypto.subtle.importKey("raw", Uint8Array.from(value.match(/../g)!, v => parseInt(v,16)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(value: string, env: CalendarConfig) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("mb-beauty-calendar-v1") }, await key(env), new TextEncoder().encode(value));
  return encode(iv) + "." + encode(new Uint8Array(bytes));
}
export async function unseal(value: string, env: CalendarConfig) {
  const [iv,data] = value.split(".");
  const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv), additionalData: new TextEncoder().encode("mb-beauty-calendar-v1") }, await key(env), decode(data));
  return new TextDecoder().decode(bytes);
}
async function db<T>(env: CalendarConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(DB + "/rest/v1/" + path, { method, headers: { apikey: env.SUPABASE_SECRET_KEY!, "Content-Type": "application/json", Prefer: "return=representation" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Calendar storage unavailable");
  return response.status === 204 ? undefined as T : await response.json() as T;
}
async function token(env: CalendarConfig, params: Record<string,string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...params, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET! }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Google authorization unavailable");
  return await response.json() as { access_token: string; refresh_token?: string; scope?: string };
}
async function google(access: string, path: string, method = "GET", body?: unknown) {
  return fetch("https://www.googleapis.com/calendar/v3/" + path, { method, headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
}
function cookie(request: Request, name: string) { return request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(name+"="))?.slice(name.length+1); }
async function operator(request: Request, env: CalendarConfig) {
  const access = cookie(request, "mb_beauty_access_token");
  if (!access) return null;
  const response = await fetch(DB + "/auth/v1/user", { headers: { apikey: env.SUPABASE_SECRET_KEY!, Authorization: "Bearer " + access }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  const auth = await response.json() as {id:string};
  const profiles = await db<Array<{id:string;professional_key:string;role:string;is_active:boolean;must_change_password:boolean}>>(env, "staff_profiles?id=eq."+encodeURIComponent(auth.id)+"&select=id,professional_key,role,is_active,must_change_password");
  const p = profiles[0];
  return p && p.is_active && !p.must_change_password && (p.professional_key === "nurme" || p.role === "admin") ? p : null;
}
function result(body: unknown, status = 200) { return Response.json(body, {status,headers:{"Cache-Control":"no-store"}}); }
function back(status: string) { return new Response(null,{status:303,headers:{Location:ORIGIN+"/panel/google-calendar?result="+status,"Cache-Control":"no-store","Referrer-Policy":"no-referrer","Set-Cookie":COOKIE+"=; Path=/api/google-calendar; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}}); }
export async function calendarRoute(request: Request, env: CalendarConfig): Promise<Response> {
  const url = new URL(request.url);
  if (url.origin !== ORIGIN) return result({error:"Usa la dirección oficial de MB Beauty."},403);
  if (!configured(env)) return result({error:"La conexión con Google está pendiente de configuración."},503);
  try {
    if (url.pathname.endsWith("/callback") && request.method === "GET") {
      const state = url.searchParams.get("state"), saved = cookie(request,COOKIE);
      if (!state || !saved) return back("invalid");
      const flow = JSON.parse(await unseal(saved,env)) as {nonce:string;uid:string;expires:number;verifier:string};
      if (flow.nonce !== state || flow.expires < Date.now()) return back("invalid");
      // Consume the nonce atomically. Replays and a second browser callback cannot connect.
      const rows = await db<Connection[]>(env,"google_calendar_connection?id=eq.nurme&nonce=eq."+encodeURIComponent(state)+"&nonce_expires_at=gt."+encodeURIComponent(new Date().toISOString()),"PATCH",{nonce:null,nonce_expires_at:null});
      if (!rows.length || rows[0].connected_by !== flow.uid) return back("invalid");
      if (url.searchParams.has("error")) return back("cancelled");
      const profiles = await db<Array<{is_active:boolean;must_change_password:boolean;role:string;professional_key:string}>>(env,"staff_profiles?id=eq."+encodeURIComponent(flow.uid)+"&select=is_active,must_change_password,role,professional_key");
      const p = profiles[0];
      if (!p?.is_active || p.must_change_password || (p.professional_key !== "nurme" && p.role !== "admin")) return back("invalid");
      const code = url.searchParams.get("code");
      if (!code) return back("invalid");
      const tokens = await token(env,{grant_type:"authorization_code",code,code_verifier:flow.verifier,redirect_uri:CALLBACK});
      if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(CALENDAR_SCOPE)) return back("failed");
      let calendarId = rows[0].calendar_id;
      if (calendarId) {
        const check = await google(tokens.access_token,"calendars/"+encodeURIComponent(calendarId));
        if (!check.ok) return back("account");
      } else {
        const response = await google(tokens.access_token,"calendars","POST",{summary:"Citas MB Beauty",timeZone:"Atlantic/Canary",description:"Citas de Nurme. Gestionadas desde el panel de MB Beauty."});
        if (!response.ok) return back("failed");
        calendarId = (await response.json() as {id:string}).id;
      }
      await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{calendar_id:calendarId,refresh_token:await seal(tokens.refresh_token,env),last_error:null,cursor:"1970-01-01T00:00:00Z",cursor_id:null});
      return back("connected");
    }
    const user = await operator(request,env);
    if (!user) return result({error:"Acceso exclusivo para Nurme o el administrador técnico."},403);
    const rows = await db<Connection[]>(env,"google_calendar_connection?id=eq.nurme&select=*");
    const connection = rows[0];
    if (url.pathname.endsWith("/status") && request.method === "GET") return result({connected:!!connection?.refresh_token,lastSync:connection?.last_synced_at,error:connection?.last_error});
    if (request.method !== "POST") return result({error:"Método no permitido."},405);
    if (request.headers.get("origin") !== ORIGIN) return result({error:"Solicitud no válida."},403);
    if (url.pathname.endsWith("/connect")) {
      if (!connection) return result({error:"Falta preparar el almacenamiento."},503);
      const nonce = encode(crypto.getRandomValues(new Uint8Array(32)));
      const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier))));
      const expires = Date.now()+600000;
      await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{nonce,nonce_expires_at:new Date(expires).toISOString(),connected_by:user.id});
      const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      target.search = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID!,redirect_uri:CALLBACK,response_type:"code",scope:CALENDAR_SCOPE,access_type:"offline",prompt:"consent select_account",state:nonce,code_challenge:challenge,code_challenge_method:"S256"}).toString();
      return new Response(null,{status:303,headers:{Location:target.toString(),"Cache-Control":"no-store","Set-Cookie":COOKIE+"="+await seal(JSON.stringify({nonce,uid:user.id,expires,verifier}),env)+"; Path=/api/google-calendar; HttpOnly; Secure; SameSite=Lax; Max-Age=600"}});
    }
    if (url.pathname.endsWith("/sync")) { await syncCalendar(env); return back("synced"); }
    if (url.pathname.endsWith("/disconnect")) {
      if (connection?.refresh_token) {
        const refresh = await unseal(connection.refresh_token,env);
        const revoke = await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:refresh}),signal:AbortSignal.timeout(10000)});
        if (!revoke.ok && revoke.status !== 400) return result({error:"Google no pudo revocar el permiso. Vuelve a intentarlo."},502);
      }
      await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{refresh_token:null,nonce:null,nonce_expires_at:null,last_error:null});
      return back("disconnected");
    }
    return result({error:"Ruta no encontrada."},404);
  } catch { return url.pathname.endsWith("/callback") ? back("failed") : result({error:"Google Calendar no está disponible. Vuelve a intentarlo."},502); }
}
export async function syncCalendar(env: CalendarConfig) {
  if (!configured(env)) return;
  const now = new Date();
  const rows = await db<Connection[]>(env,"google_calendar_connection?id=eq.nurme&refresh_token=not.is.null&lease_until=lt."+encodeURIComponent(now.toISOString()),"PATCH",{lease_until:new Date(now.getTime()+600000).toISOString()});
  const connection = rows[0];
  if (!connection?.refresh_token || !connection.calendar_id) return;
  try {
    const tokens = await token(env,{grant_type:"refresh_token",refresh_token:await unseal(connection.refresh_token,env)});
    const base = "calendars/"+encodeURIComponent(connection.calendar_id)+"/events";
    const lower = connection.cursor_id
      ? "or=(updated_at.gt."+encodeURIComponent(connection.cursor)+",and(updated_at.eq."+encodeURIComponent(connection.cursor)+",id.gt."+connection.cursor_id+"))"
      : "updated_at=gte."+encodeURIComponent(connection.cursor);
    const appointments = await db<CalendarAppointment[]>(env,"appointments?select=id,professional_key,service_name,starts_at,ends_at,status,updated_at&"+lower+"&updated_at=lt."+encodeURIComponent(now.toISOString())+"&order=updated_at.asc,id.asc&limit=10");
      for (const a of appointments) {
        const path = base+"/"+eventId(a.id)+"?sendUpdates=none";
        if (!shouldPublish(a)) {
          const response = await google(tokens.access_token,path,"DELETE");
          if (!response.ok && ![404,410].includes(response.status)) throw new Error("Google delete failed");
        } else {
        const projected = projectEvent(a);
        let response = await google(tokens.access_token,path,"PUT",projected);
        if (response.status === 404) {
          response = await google(tokens.access_token,base+"?sendUpdates=none","POST",projected);
          if (response.status === 409) response = await google(tokens.access_token,path,"PUT",projected);
        }
        if (!response.ok) throw new Error("Google write failed");
        }
        // Preserve progress even if waitUntil reaches its execution limit mid-batch.
        await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{cursor:a.updated_at,cursor_id:a.id});
      }
    const last = appointments.at(-1);
    await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{
      cursor: appointments.length === 10 && last ? last.updated_at : now.toISOString(),
      cursor_id: appointments.length === 10 && last ? last.id : null,
      last_synced_at:new Date().toISOString(),last_error:null,
    });
  } catch {
    await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{last_error:"Sincronización pendiente. Se reintentará; si persiste, vuelve a conectar Google."});
    throw new Error("Calendar synchronization failed");
  } finally {
    await db(env,"google_calendar_connection?id=eq.nurme","PATCH",{lease_until:"1970-01-01T00:00:00Z"});
  }
}
