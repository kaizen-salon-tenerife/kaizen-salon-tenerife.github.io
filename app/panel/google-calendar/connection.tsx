"use client";
import { useEffect, useState } from "react";
type State = { connected?: boolean; lastSync?: string | null; error?: string | null };
export default function CalendarConnection({ outcome = "" }: { outcome?: string }) {
  const [state,setState] = useState<State | null>(null);
  const outcomes: Record<string,string> = {connected:"Cuenta conectada. Las citas se enviarán en la próxima sincronización.",disconnected:"Google Calendar desconectado.",synced:"Sincronización solicitada.",cancelled:"Has cancelado la autorización.",invalid:"La autorización ha caducado. Vuelve a conectar.",account:"Selecciona la misma cuenta de Google que conectaste anteriormente.",failed:"No se pudo conectar. Vuelve a intentarlo."};
  const feedback = outcomes[outcome] ?? "";
  const [available,setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/google-calendar/status",{cache:"no-store"}).then(async r => {
      const value = await r.json() as State;
      if (alive) { setState(value); setAvailable(r.ok); }
    }).catch(()=>{ if (alive) setState({error:"No se pudo comprobar la conexión. Recarga la página."}); });
    return ()=>{alive=false;};
  },[]);
  return <section className="mb-calendar-connection" aria-label="Conexión de Google Calendar">
    {feedback && <p role="status">{feedback}</p>}
    <p role="status">{!state ? "Comprobando conexión…" : state.connected ? "Google Calendar conectado." : available ? "Google Calendar aún no está conectado." : "Pendiente de configuración de Google Cloud."}</p>
    {state?.error && <p role="alert">{state.error}</p>}
    {state?.lastSync && <p>Última sincronización: {new Date(state.lastSync).toLocaleString("es-ES",{timeZone:"Atlantic/Canary"})}</p>}
    <p>Las citas se sincronizan automáticamente al reservar en la web o guardar cambios en el panel. El título muestra el nombre de la clienta y el servicio; las notas de la cita aparecen en la descripción. Si hay un fallo temporal, se reintenta cada cinco minutos.</p>
    <p>Al conectar autorizas enviar a tu calendario privado de Google el nombre de la clienta, el servicio, la fecha, la duración y las notas de la cita. No se envían teléfonos, fichas ni fotografías. No se accede a tu calendario personal.</p>
    <form action="/api/google-calendar/connect" method="post"><button className="mb-button" disabled={!available}>{state?.connected ? "Volver a conectar Google" : "Conectar con Google"} ↗</button></form>
    {state?.connected && <><form action="/api/google-calendar/sync" method="post"><button className="mb-button">Sincronizar ahora</button></form><form action="/api/google-calendar/disconnect" method="post"><p>Desconectar detiene la sincronización y revoca el permiso. Las citas ya enviadas permanecen en Google.</p><button className="mb-button">Desconectar Google Calendar</button></form></>}
  </section>;
}
