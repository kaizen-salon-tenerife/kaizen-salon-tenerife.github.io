"use client";
import { useEffect,useState, type FormEvent } from "react";
import BookingDateCalendar from "../components/booking-date-calendar";
import { whatsappLink } from "../../lib/whatsapp-link";

type Appointment={service:string;startsAt:string;endsAt:string;status:string};
type Booking={reference:string;name:string;version:string;canCancel:boolean;canModify:boolean;appointments:Appointment[]};
type Service={id:string;category:string;name:string;durationMinutes:number;priceLabel:string;professionalKey:string;isActive:boolean};
type Slot={time:string;startsAt:string;endsAt:string};
const statusLabels:Record<string,string>={confirmed:"Confirmada",pending:"Pendiente",cancelled:"Cancelada",completed:"Realizada",no_show:"No acudió"};
function dateLabel(value:string){return new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value.slice(0,10)+"T12:00:00Z"));}
function bookingWhatsAppMessage(booking:Booking|null){
  const cancelled=booking&&booking.appointments.length>0&&booking.appointments.every(a=>a.status==="cancelled");
  return booking
    ? `Hola Nurme 😊 Soy ${booking.name}. ${cancelled?"He cancelado mi cita desde la web y quería avisarte.":"Te escribo sobre mi cita."}\n\n🔖 Referencia: ${booking.reference}\n${booking.appointments.map(a=>`📅 ${dateLabel(a.startsAt)}\n🕘 ${a.startsAt.slice(11,16)} h (Canarias)\n💅 ${a.service}`).join("\n\n")}\n\n${cancelled?"¡Gracias por tu comprensión! 💛":"¿Me ayudas, por favor? ¡Gracias! 💛"}`
    : "Hola Nurme 😊 Quería consultarte sobre mi cita en MB Nurme Beauty. ¿Me ayudas, por favor?";
}
async function api(body:unknown,signal?:AbortSignal){const r=await fetch("/api/manage-booking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal});const v=await r.json();if(!r.ok)throw new Error(v.error||"No se pudo completar la operación.");return v;}
export default function ManageBooking(){
  const [reference,setReference]=useState(""),[phone,setPhone]=useState(""),[token,setToken]=useState("");
  const [booking,setBooking]=useState<Booking|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(false),[cancelling,setCancelling]=useState(false),[services,setServices]=useState<Service[]>([]),[catalogError,setCatalogError]=useState("");
  const [changeServices,setChangeServices]=useState(false),[selected,setSelected]=useState<string[]>([]),[date,setDate]=useState(""),[slots,setSlots]=useState<Slot[]>([]),[chosen,setChosen]=useState(""),[loadingSlots,setLoadingSlots]=useState(false);
  useEffect(()=>{
    if(!editing)return;
    const abort=new AbortController();
    fetch("/api/services",{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(v=>setServices(v.services.filter((s:Service)=>s.isActive&&s.professionalKey==="nurme"))).catch(e=>{if(e.name!=="AbortError")setCatalogError("No se pudo cargar el catálogo. Puedes cambiar la fecha y mantener tus servicios actuales.");});
    return ()=>abort.abort();
  },[editing]);
  useEffect(()=>{
    const abort=new AbortController();
    // Loading state follows the asynchronous availability request. Each selection
    // cancels its predecessor, so a late response cannot replace the new slots.
    queueMicrotask(()=>{
      if(abort.signal.aborted)return;
      setChosen("");setSlots([]);setLoadingSlots(false);
      if(!editing||!date||(changeServices&&!selected.length))return;
      setLoadingSlots(true);setError("");
      api({action:"slots",token,date,...(changeServices?{serviceIds:selected}:{})},abort.signal).then(v=>{if(!abort.signal.aborted)setSlots(v.slots);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoadingSlots(false);});
    });
    return ()=>abort.abort();
  },[editing,date,changeServices,selected,token]);
  async function lookup(e:FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const result=await api({reference,phone});setBooking(result);setToken(result.token);setPhone("");}catch(e){setError(e instanceof Error?e.message:"No se pudo consultar la cita.");}finally{setBusy(false);}}
  async function save(action:"cancel"|"reschedule"){
    if(!booking)return;setBusy(true);setError("");setNotice("");
    try{const result=await api({action,token,version:booking.version,...(action==="reschedule"?{startsAt:chosen,...(changeServices?{serviceIds:selected}:{})}:{})});setBooking(result);setEditing(false);setCancelling(false);setNotice(action==="cancel"?"Tu cita ha sido cancelada y el horario ha quedado libre.":"Los cambios se han guardado. Esta es tu cita actualizada.");}
    catch(e){setError(e instanceof Error?e.message:"No se pudo guardar.");}finally{setBusy(false);}
  }
  function reset(){setBooking(null);setToken("");setReference("");setPhone("");setEditing(false);setCancelling(false);setError("");setNotice("");}
  const whatsappMessage=bookingWhatsAppMessage(booking);
  const whatsappUrl=whatsappLink("34652430072",whatsappMessage);
  async function copyWhatsAppMessage(){
    try{await navigator.clipboard.writeText(whatsappMessage);setNotice("Mensaje copiado con sus emojis. Puedes pegarlo en WhatsApp.");setError("");}
    catch{setError("No se pudo copiar el mensaje. Usa el enlace para abrir WhatsApp.");}
  }
  return <>
    {error&&<p className="customer-booking-error" role="alert">{error}</p>}{notice&&<p className="customer-booking-notice" role="status">{notice}</p>}
    {!booking?<form className="customer-booking-card" onSubmit={lookup}><h2>Consulta tu reserva</h2><label className="field"><span>Código de reserva</span><input required autoComplete="off" value={reference} onChange={e=>setReference(e.target.value.toUpperCase())} placeholder="Ej. KZ-ABC123" maxLength={12} autoCapitalize="characters" spellCheck={false}/></label><label className="field"><span>Teléfono usado al reservar</span><input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24} placeholder="Incluye el prefijo si lo usaste"/></label><p>El código aparece en la confirmación al terminar la reserva. El teléfono nos ayuda a proteger tu cita.</p><button className="mb-button" disabled={busy}>{busy?"Consultando…":"Ver mi cita"}</button></form>:<>
      <section className="customer-booking-card" aria-label="Información de tu cita"><p className="mb-eyebrow">Reserva {booking.reference}</p><h2>{booking.name}</h2>{booking.appointments.map((a,i)=><dl className="customer-booking-details" key={i}><div><dt>Servicios</dt><dd>{a.service}</dd></div><div><dt>Fecha</dt><dd>{dateLabel(a.startsAt)}</dd></div><div><dt>Hora de Canarias</dt><dd>{a.startsAt.slice(11,16)}–{a.endsAt.slice(11,16)} h</dd></div><div><dt>Estado</dt><dd>{statusLabels[a.status]||a.status}</dd></div></dl>)}<p><strong>Dirección:</strong> C. María Luisa, 5, 38108 La Laguna, Taco, Santa Cruz de Tenerife, España.</p>
      <p>Los cambios y cancelaciones online se permiten hasta 6 horas antes. Para gestiones fuera de ese plazo, contacta con Nurme.</p>
      {!editing&&!cancelling&&<div className="customer-booking-actions">{booking.canModify&&<button className="mb-button" onClick={()=>{setDate("");setSelected([]);setChangeServices(false);setEditing(true);setError("");setNotice("");}}>Modificar cita</button>}{booking.canCancel&&<button className="customer-booking-cancel" onClick={()=>{setCancelling(true);setError("");setNotice("");}}>Cancelar cita</button>}</div>}
      {!booking.canCancel&&booking.appointments.some(a=>["pending","confirmed"].includes(a.status))&&<p role="status">Esta cita requiere gestión directa con Nurme.</p>}
      <div className="customer-booking-actions"><a className="mb-text-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Contactar con Nurme por WhatsApp ↗</a><button className="mb-text-link" onClick={()=>void copyWhatsAppMessage()}>Copiar mensaje</button></div></section>
      {cancelling&&<section className="customer-booking-card customer-booking-confirm" role="alertdialog" aria-modal="false" aria-labelledby="cancel-title"><h2 id="cancel-title">¿Quieres cancelar tu cita?</h2><p>Se cancelarán todos los servicios de esta reserva. La cita se retirará de la agenda y el hueco quedará disponible para otra clienta.</p><div className="customer-booking-actions"><button className="customer-booking-cancel" disabled={busy} onClick={()=>void save("cancel")}>{busy?"Cancelando…":"Sí, cancelar mi cita"}</button><button className="mb-text-link" disabled={busy} onClick={()=>setCancelling(false)}>Conservar mi cita</button></div></section>}
      {editing&&<section className="customer-booking-card"><h2>Elige tu nueva cita</h2><p>Puedes mantener tus servicios o elegir otros del catálogo. Después selecciona fecha y hora.</p>{catalogError&&<p role="alert">{catalogError}</p>}<label className="customer-booking-check"><input type="checkbox" checked={changeServices} disabled={!services.length||busy} onChange={e=>setChangeServices(e.target.checked)}/> Cambiar también los servicios</label>
      {changeServices&&<fieldset className="customer-booking-services"><legend>Servicios de tu nueva cita (máximo 12)</legend>{services.map(s=><label className="customer-booking-check" key={s.id}><input type="checkbox" checked={selected.includes(s.id)} disabled={busy||(!selected.includes(s.id)&&selected.length>=12)} onChange={()=>setSelected(old=>old.includes(s.id)?old.filter(id=>id!==s.id):[...old,s.id])}/><span><strong>{s.name}</strong><small>{s.priceLabel} · {s.durationMinutes} min</small></span></label>)}</fieldset>}
      <BookingDateCalendar value={date} onChange={setDate}/>{loadingSlots?<p role="status">Comprobando horarios…</p>:date&&<div className="customer-booking-slots" role="group" aria-label="Horas disponibles">{slots.length?slots.map(s=><button type="button" key={s.startsAt} aria-pressed={chosen===s.startsAt} onClick={()=>setChosen(s.startsAt)}>{s.time}–{s.endsAt.slice(11,16)}</button>):<p>No hay horas disponibles para esta selección. Prueba otro día.</p>}</div>}
      {chosen&&<p className="customer-booking-notice">Nueva fecha: {dateLabel(chosen)} a las {chosen.slice(11,16)} h (Canarias).</p>}<div className="customer-booking-actions"><button className="mb-button" disabled={busy||loadingSlots||!chosen} onClick={()=>void save("reschedule")}>{busy?"Guardando…":"Guardar cambios"}</button><button className="mb-text-link" disabled={busy} onClick={()=>{setEditing(false);setError("");}}>Volver sin cambiar</button></div></section>}
      <button className="mb-text-link" disabled={busy} onClick={reset}>Consultar otra reserva / Salir</button>
    </>}
    <p className="customer-booking-help">¿No tienes el código o reservaste directamente con Nurme? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.</p>
  </>;
}
