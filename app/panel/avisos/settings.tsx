"use client";
import {useEffect,useState} from "react";
import {staffFetch} from "@/lib/staff-fetch";
type Delivery={id:string;channel:string;status:string;last_error:string|null};
type Alert={id:string;created_at:string;seen_at:string|null;appointment:{id:string;service_name:string;starts_at:string;status:string;client:{name:string}|null};deliveries:Delivery[]};
type State={emailConnected:boolean;emailEnabled:boolean;email:string;devices:{id:string;last_test_at:string|null}[];alerts:Alert[];calendarConfiguredAt:string|null;calendarManualVerifiedAt:string|null;calendarError:string|null;calendarLastSync:string|null;calendarSyncError:string|null};
const labels:Record<string,string>={pending:"Pendiente",sending:"En proceso",sent:"Aceptado por el servicio",failed:"Requiere atención",uncertain:"Resultado sin confirmar",skipped:"No enviado"};
async function post(path:string,data:unknown={}) {
  const r=await staffFetch("/api/owner-alerts/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const value=await r.json();if(!r.ok)throw new Error(value.error||"No se pudo completar la operación.");return value;
}
export default function Alerts({outcome=""}:{outcome?:string}) {
  const [state,setState]=useState<State|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[endpoint,setEndpoint]=useState("");
  const [supported,setSupported]=useState(false),[iphone,setIphone]=useState(false),[installed,setInstalled]=useState(false);
  async function refresh(){const r=await staffFetch("/api/owner-alerts/status",{cache:"no-store"});const v=await r.json();if(!r.ok)throw new Error(v.error);setState(v);}
  useEffect(()=>{
    // Browser capabilities are unavailable during the server render.
    const timer=window.setTimeout(()=>{
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    setIphone(/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);
    void refresh().catch(e=>setMessage(e.message));
    if("serviceWorker" in navigator) void navigator.serviceWorker.getRegistration("/").then(r=>r?.pushManager.getSubscription()).then(s=>setEndpoint(s?.endpoint||""));
    },0);
    return ()=>window.clearTimeout(timer);
  },[]);
  async function action(fn:()=>Promise<void>){setBusy(true);setMessage("");try{await fn();await refresh();}catch(e){setMessage(e instanceof Error?e.message:"No se pudo completar la operación.");}finally{setBusy(false);}}
  async function enable(){
    // Ask directly from a tap; iOS requires this user gesture.
    const permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Permite las notificaciones en los ajustes del dispositivo para continuar.");
    const {publicKey}=await post("setup");
    const r=await navigator.serviceWorker.register("/owner-alerts-sw.js",{scope:"/"});
    await navigator.serviceWorker.ready;
    const bytes=Uint8Array.from(atob(publicKey.replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0));
    const sub=await r.pushManager.getSubscription()||await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
    await post("subscribe",{subscription:sub.toJSON()});setEndpoint(sub.endpoint);setMessage("Dispositivo registrado. Pulsa «Enviar aviso de prueba» y comprueba que aparece.");
  }
  const feedback:Record<string,string>={connected:"Gmail conectado. Los avisos pendientes se enviarán automáticamente.",account:"Selecciona la cuenta de Nurme: nurmemartinbenitez@gmail.com.",cancelled:"Autorización cancelada.",invalid:"La autorización ha caducado. Vuelve a conectar.",failed:"No se pudo conectar Gmail. Revisa que Gmail API esté habilitada."};
  return <>
    {feedback[outcome]&&<p role="status">{feedback[outcome]}</p>}{message&&<p role="status">{message}</p>}
    <section className="mb-calendar-connection"><h2>1. Aviso en este dispositivo</h2>
      <p>{endpoint?"Este navegador tiene una suscripción. Usa la prueba para verificar la recepción.":"Este dispositivo aún no recibe notificaciones de nuevas reservas."}</p>
      <p>En el iPhone: abre la web en Safari → Compartir → Añadir a la pantalla de inicio. Abre ese icono, entra en el panel y activa los avisos aquí. Necesitas iOS 16.4 o posterior.</p>
      {iphone&&!installed&&<p>Abre primero la web desde el icono de la pantalla de inicio para activar las notificaciones.</p>}
      {!supported&&<p>Este navegador no ofrece notificaciones push. Prueba desde la web instalada en el iPhone.</p>}
      <button className="mb-button" disabled={busy||!supported||(iphone&&!installed)} onClick={()=>void action(enable)}>Activar avisos en este dispositivo</button>
      {endpoint&&<><button className="mb-button" disabled={busy} onClick={()=>void action(async()=>{const r=await post("test-push",{endpoint});setMessage(r.message);})}>Enviar aviso de prueba</button><button className="mb-text-link" disabled={busy} onClick={()=>void action(async()=>{await post("unsubscribe",{endpoint});const r=await navigator.serviceWorker.getRegistration("/");await(await r?.pushManager.getSubscription())?.unsubscribe();setEndpoint("");setMessage("Avisos desactivados en este dispositivo.");})}>Desactivar este dispositivo</button></>}
      <p>El sonido y la aparición en pantalla dependen de los permisos, conexión y modo Concentración del iPhone.</p>
    </section>
    <section className="mb-calendar-connection"><h2>2. Correo a Nurme</h2><p>{state?.emailConnected?"Gmail conectado para enviar avisos a "+state.email:"Pendiente de conectar Gmail de Nurme."}</p><p>Se solicita permiso para enviar mensajes y comprobar la dirección de la cuenta, sin leer el correo. Los avisos quedan guardados también en Gmail.</p><form action="/api/google-calendar/connect-email" method="post"><button className="mb-button">{state?.emailConnected?"Volver a conectar Gmail":"Conectar Gmail de Nurme"} ↗</button></form>{state?.emailConnected&&<button className="mb-button" disabled={busy} onClick={()=>void action(async()=>{const r=await post("test-email");setMessage(r.message);})}>Enviar correo de prueba</button>}<p>Activa las notificaciones de Gmail o Mail en el iPhone. Comprueba también la bandeja de entrada: el correo de respaldo y la notificación web son canales independientes.</p></section>
    <section className="mb-calendar-connection"><h2>3. Google Calendar</h2><p>{state?.calendarManualVerifiedAt?"Avisos de altas, cambios y cancelaciones configurados y verificados directamente en Google Calendar.":state?.calendarConfiguredAt?"Avisos por correo del calendario configurados para altas, cambios y cancelaciones.":"Configuración de avisos del calendario pendiente de sincronización."}</p>{state?.calendarError&&(state.calendarManualVerifiedAt?<p>La comprobación automática por API no está disponible; los ajustes se han verificado en Google Calendar.</p>:<p role="alert">{state.calendarError}</p>)}{state?.calendarSyncError&&<p role="alert">{state.calendarSyncError}</p>}<p>Las citas incluyen un recordatorio 30 minutos antes. Activa las notificaciones de Google Calendar en los ajustes del iPhone. Google decide cuándo envía los correos por cambios hechos por la propia cuenta; el correo directo y el aviso web cubren las nuevas reservas.</p><a className="mb-text-link" href="/panel/google-calendar">Revisar Google Calendar ↗</a></section>
    <section className="mb-calendar-connection"><h2>Nuevas reservas</h2><p>«Aceptado por el servicio» indica que el proveedor recibió el aviso; confirma su aparición con una prueba en el móvil.</p><button className="mb-text-link" disabled={busy} onClick={()=>void action(refresh)}>Actualizar</button>{!state?<p>Cargando…</p>:!state.alerts.length?<p>Las nuevas reservas de las clientas aparecerán aquí a partir de la activación de estos avisos.</p>:state.alerts.map(a=><article key={a.id} className="mb-alert-item"><h3>{a.appointment?.client?.name||"Clienta"} · {a.appointment?.service_name}</h3><p>{a.appointment?.starts_at.replace("T"," ").slice(0,16)} · {a.seen_at?"Revisada":"Nueva"}</p><a className="mb-text-link" href={`/panel?cita=${a.appointment?.id}`}>Ver cita ↗</a>{!a.seen_at&&<button className="mb-text-link" disabled={busy} onClick={()=>void action(async()=>{await post("seen",{id:a.id});})}>Marcar como revisada</button>}<ul>{a.deliveries.map(d=><li key={d.id}>{d.channel==="email"?"Correo":"Dispositivo"}: {labels[d.status]}{d.last_error&&` · ${d.last_error}`}{["failed","uncertain"].includes(d.status)&&<button disabled={busy} onClick={()=>void action(async()=>{if(d.status==="uncertain"&&!window.confirm("Comprueba primero si el correo llegó. Reenviarlo podría duplicarlo. ¿Quieres reintentar?"))return;await post("retry",{id:d.id});})}>Reintentar</button>}</li>)}</ul></article>)}</section>
  </>;
}
