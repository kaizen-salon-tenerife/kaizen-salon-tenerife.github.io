import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { db, operator, seal, unseal, token, type CalendarConfig } from "../google-calendar/server";

const ORIGIN = "https://mb-beauty.leonforge.workers.dev";
const EMAIL = "nurmemartinbenitez@gmail.com";
type Settings = { email_enabled:boolean; email_refresh_token:string|null; vapid_public_key:string|null; vapid_private_key:string|null; calendar_configured_at:string|null; calendar_manual_verified_at:string|null; calendar_error:string|null };
type Device = { id:string; user_id:string; active:boolean; subscription:PushSubscription };
type Job = { id:string; alert_id:string; channel:"email"|"push"; target:string; attempts:number; claim_id:string };
type Appointment = { id:string; status:string; starts_at:string; service_name:string; client:{name:string}|null };
function base64(bytes:Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function url64(bytes:Uint8Array) { return base64(bytes).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); }
const json = (data:unknown,status=200) => Response.json(data,{status,headers:{"Cache-Control":"no-store"}});

export function validSubscription(value:unknown): value is PushSubscription {
  if (!value || typeof value!=="object") return false;
  const s=value as PushSubscription;
  try {
    const url=new URL(s.endpoint);
    // Never fetch an arbitrary endpoint supplied by a browser (SSRF).
    if (url.protocol!=="https:" || url.port || url.username || url.password || url.hash) return false;
    if (!(url.hostname==="web.push.apple.com" || url.hostname.endsWith(".push.apple.com") || url.hostname==="fcm.googleapis.com" || url.hostname==="updates.push.services.mozilla.com" || url.hostname.endsWith(".notify.windows.com"))) return false;
    return s.endpoint.length<2048 && /^[A-Za-z0-9_-]{87}=?$/.test(s.keys?.p256dh??"") && /^[A-Za-z0-9_-]{22}={0,2}$/.test(s.keys?.auth??"");
  } catch { return false; }
}
async function settings(env:CalendarConfig) { return (await db<Settings[]>(env,"owner_alert_settings?id=eq.nurme&select=*"))[0]; }
async function ensureKeys(env:CalendarConfig) {
  let s=await settings(env);
  if (!s.vapid_public_key) {
    const pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
    const pub=url64(new Uint8Array(await crypto.subtle.exportKey("raw",pair.publicKey)));
    const priv=await crypto.subtle.exportKey("jwk",pair.privateKey);
    await db(env,"owner_alert_settings?id=eq.nurme&vapid_public_key=is.null","PATCH",{vapid_public_key:pub,vapid_private_key:await seal(priv.d!,env)});
    s=await settings(env);
  }
  return s;
}
export function alertContent(a:Appointment) {
  const name=(a.client?.name?.trim() || "Clienta").slice(0,100);
  const date=a.starts_at.slice(0,10).split("-").reverse().join("/");
  return { title:"Nueva cita · MB Nurme Beauty", body:`${name} · ${a.service_name.slice(0,180)} · ${date} a las ${a.starts_at.slice(11,16)}`, url:`${ORIGIN}/panel?cita=${encodeURIComponent(a.id)}`, tag:`booking-${a.id}` };
}
export function emailRaw(content:ReturnType<typeof alertContent>, id:string) {
  const subject=base64(new TextEncoder().encode(content.title));
  const text=`${content.title}\n\n${content.body}\n\nAbrir en el panel:\n${content.url}\n\nAviso automático de la agenda de MB Nurme Beauty.`;
  return url64(new TextEncoder().encode([
    `From: MB Nurme Beauty <${EMAIL}>`,`To: ${EMAIL}`,`Subject: =?UTF-8?B?${subject}?=`,
    `Message-ID: <mb-alert-${id}@mb-beauty.leonforge.workers.dev>`,"MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: base64","",base64(new TextEncoder().encode(text)),
  ].join("\r\n")));
}
async function push(env:CalendarConfig,s:Settings,d:Device,content:ReturnType<typeof alertContent>) {
  if (!validSubscription(d.subscription) || !s.vapid_private_key || !s.vapid_public_key) throw new Error("Push no configurado");
  const payload=await buildPushPayload({data:JSON.stringify(content),options:{ttl:3600}},d.subscription,{subject:`mailto:${EMAIL}`,publicKey:s.vapid_public_key,privateKey:await unseal(s.vapid_private_key,env)});
  return fetch(d.subscription.endpoint,{...payload,redirect:"error",signal:AbortSignal.timeout(8000)});
}
export async function deliverOwnerAlerts(env:CalendarConfig) {
  if (!env.SUPABASE_SECRET_KEY) return;
  const s=await settings(env);
  const jobs=await db<Job[]>(env,"rpc/claim_owner_alert_deliveries","POST",{});
  if (!jobs.length) return;
  await Promise.allSettled(jobs.map(async job=>{
    const finish=async (status:string,error:string|null=null) => db(env,`owner_alert_deliveries?id=eq.${job.id}&claim_id=eq.${job.claim_id}`,"PATCH",{
      status,last_error:error,lease_until:"1970-01-01T00:00:00Z",sent_at:status==="sent"?new Date().toISOString():null,
      next_attempt_at:new Date(Date.now()+Math.min(3600,60*2**job.attempts)*1000).toISOString(),
    });
    let emailStarted=false;
    try {
      const alert=(await db<Array<{appointment:Appointment}>>(env,`owner_booking_alerts?id=eq.${job.alert_id}&select=appointment:appointments(id,status,starts_at,service_name,client:clients(name))`))[0];
      if (!alert || alert.appointment?.status!=="confirmed") { await finish("skipped","La cita ya no está confirmada."); return; }
      const content=alertContent(alert.appointment);
      let response:Response;
      if (job.channel==="email") {
        if (!s.email_enabled || !s.email_refresh_token) { await finish("pending","Conecta Gmail para enviar el aviso."); return; }
        const tokens=await token(env,{grant_type:"refresh_token",refresh_token:await unseal(s.email_refresh_token,env)});
        emailStarted=true;
        response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+tokens.access_token,"Content-Type":"application/json"},body:JSON.stringify({raw:emailRaw(content,job.id)}),signal:AbortSignal.timeout(8000)});
      } else {
        const d=(await db<Device[]>(env,`owner_push_subscriptions?id=eq.${job.target}&active=eq.true&select=*`))[0];
        if (!d) { await finish("skipped","Dispositivo desactivado."); return; }
        const profile=(await db<Array<{is_active:boolean;must_change_password:boolean;role:string;professional_key:string}>>(env,`staff_profiles?id=eq.${d.user_id}&select=is_active,must_change_password,role,professional_key`))[0];
        if (!profile?.is_active || profile.must_change_password || (profile.professional_key!=="nurme" && profile.role!=="admin")) { await finish("skipped","El dispositivo ya no tiene acceso."); return; }
        response=await push(env,s,d,content);
        if ([404,410].includes(response.status)) {
          await db(env,`owner_push_subscriptions?id=eq.${d.id}`,"PATCH",{active:false});
          await finish("failed","Permiso del dispositivo caducado. Activa de nuevo las notificaciones."); return;
        }
      }
      if (response.ok) { await finish("sent"); return; }
      // The response rejected this attempt; transient failures can be retried safely.
      emailStarted=false;
      if ([400,403].includes(response.status)) { await finish("failed",job.channel==="email"?"Gmail rechazó el envío. Revisa la API y vuelve a conectar Gmail.":"El dispositivo rechazó el aviso. Actívalo de nuevo."); return; }
      await finish(job.attempts>=8?"failed":"pending","El servicio no aceptó el aviso. Se reintentará.");
    } catch {
      await finish(emailStarted?"uncertain":job.attempts>=8?"failed":"pending",emailStarted?"Gmail no confirmó el resultado. Comprueba el correo antes de reenviar para evitar duplicados.":"Envío pendiente; se reintentará automáticamente.");
    }
  }));
}

export async function ownerAlertRoute(request:Request,env:CalendarConfig):Promise<Response> {
  const url=new URL(request.url);
  if (url.origin!==ORIGIN) return json({error:"Usa la web oficial."},403);
  try {
    const user=await operator(request,env);
    if (!user) return json({error:"Inicia sesión como Nurme o administrador."},401);
    if (request.method!=="GET" && request.headers.get("origin")!==ORIGIN) return json({error:"Solicitud no válida."},403);
    if (request.method==="GET" && url.pathname.endsWith("/status")) {
      const s=await settings(env);
      const devices=await db<Array<{id:string;last_test_at:string|null}>>(env,`owner_push_subscriptions?user_id=eq.${user.id}&active=eq.true&select=id,last_test_at`);
      const alerts=await db<unknown[]>(env,"owner_booking_alerts?select=id,created_at,seen_at,appointment:appointments(id,service_name,starts_at,status,client:clients(name)),deliveries:owner_alert_deliveries(id,channel,status,last_error,sent_at)&order=created_at.desc&limit=30");
      const calendar=(await db<Array<{last_synced_at:string|null;last_error:string|null;calendar_id:string|null}>>(env,"google_calendar_connection?id=eq.nurme&select=calendar_id,last_synced_at,last_error"))[0];
      return json({emailConnected:!!s.email_refresh_token,emailEnabled:s.email_enabled,email:EMAIL,devices,alerts,calendarConfiguredAt:s.calendar_configured_at,calendarManualVerifiedAt:s.calendar_manual_verified_at,calendarError:s.calendar_error,calendarLastSync:calendar?.last_synced_at,calendarSyncError:calendar?.last_error});
    }
    if (request.method!=="POST") return json({error:"Método no permitido."},405);
    if (url.pathname.endsWith("/setup")) { const s=await ensureKeys(env); return json({publicKey:s.vapid_public_key}); }
    const body=await request.json().catch(()=>null) as {subscription?:unknown;endpoint?:string;id?:string;enabled?:boolean}|null;
    if (url.pathname.endsWith("/subscribe")) {
      if (!validSubscription(body?.subscription)) return json({error:"Suscripción no válida."},400);
      const sub=body.subscription;
      const old=(await db<Array<{id:string;user_id:string}>>(env,"owner_push_subscriptions?endpoint=eq."+encodeURIComponent(sub.endpoint)+"&select=id,user_id"))[0];
      if (old && old.user_id!==user.id) return json({error:"Desactiva el aviso con la cuenta que lo registró antes de cambiar de cuenta."},409);
      const values={user_id:user.id,endpoint:sub.endpoint,subscription:sub,active:true};
      if (old) await db(env,`owner_push_subscriptions?id=eq.${old.id}`,"PATCH",values);
      else await db(env,"owner_push_subscriptions","POST",values);
      return json({ok:true});
    }
    if (url.pathname.endsWith("/unsubscribe")) {
      await db(env,`owner_push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(body?.endpoint??"")}`,"PATCH",{active:false});return json({ok:true});
    }
    if (url.pathname.endsWith("/seen") && /^[0-9a-f-]{36}$/.test(body?.id??"")) {
      await db(env,`owner_booking_alerts?id=eq.${body!.id}`,"PATCH",{seen_at:new Date().toISOString()});return json({ok:true});
    }
    if (url.pathname.endsWith("/test-email")) {
      const s=await settings(env);
      if (!s.email_enabled || !s.email_refresh_token) return json({error:"Conecta primero Gmail de Nurme."},400);
      const tokens=await token(env,{grant_type:"refresh_token",refresh_token:await unseal(s.email_refresh_token,env)});
      const content={title:"Prueba de avisos · MB Nurme Beauty",body:"Este es un aviso de prueba. No se ha creado ninguna cita. Los correos de nuevas reservas llegarán a esta cuenta.",url:ORIGIN+"/panel/avisos",tag:"mb-email-test"};
      let response:Response;
      try {
        response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+tokens.access_token,"Content-Type":"application/json"},body:JSON.stringify({raw:emailRaw(content,crypto.randomUUID())}),signal:AbortSignal.timeout(8000)});
      } catch { return json({error:"Gmail no confirmó la prueba. Comprueba el correo antes de volver a enviarla."},502); }
      if (!response.ok) return json({error:"Gmail rechazó la prueba. Revisa la conexión y que Gmail API esté habilitada."},502);
      return json({ok:true,message:"Gmail aceptó el correo de prueba. Comprueba la bandeja de entrada y los avisos de Gmail en el iPhone."});
    }
    if (url.pathname.endsWith("/test-push")) {
      const d=(await db<Device[]>(env,`owner_push_subscriptions?user_id=eq.${user.id}&active=eq.true&endpoint=eq.${encodeURIComponent(body?.endpoint??"")}&select=*`))[0];
      if (!d) return json({error:"Activa antes este dispositivo."},400);
      const s=await settings(env);
      const response=await push(env,s,d,{title:"Prueba · MB Nurme Beauty",body:"Los avisos de nuevas reservas llegarán aquí. Toca para abrir el panel.",url:ORIGIN+"/panel/avisos",tag:"mb-test"});
      if (!response.ok) return json({error:"El servicio no aceptó la prueba. Reactiva las notificaciones."},502);
      await db(env,`owner_push_subscriptions?id=eq.${d.id}`,"PATCH",{last_test_at:new Date().toISOString()});
      return json({ok:true,message:"Prueba aceptada por el servicio. Comprueba que aparece en el dispositivo."});
    }
    if (url.pathname.endsWith("/retry") && /^[0-9a-f-]{36}$/.test(body?.id??"")) {
      await db(env,`owner_alert_deliveries?id=eq.${body!.id}&status=in.(failed,uncertain)`,"PATCH",{status:"pending",attempts:0,next_attempt_at:new Date().toISOString(),lease_until:"1970-01-01T00:00:00Z",last_error:null});
      return json({ok:true});
    }
    return json({error:"Ruta no encontrada."},404);
  } catch { return json({error:"No se pudo completar la operación. Vuelve a intentarlo."},502); }
}
