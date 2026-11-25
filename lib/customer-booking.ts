import { db, seal, unseal, type CalendarConfig } from "./google-calendar/server";

const ORIGIN="https://mb-beauty.leonforge.workers.dev";
const messages:Record<string,string>={not_found:"No encontramos una reserva con ese código y teléfono. Revisa ambos datos, incluido el prefijo del teléfono si lo usaste al reservar.",changed:"La cita ha cambiado. Vuelve a consultarla antes de guardar.",cutoff:"Solo puedes cambiar o cancelar la cita hasta 6 horas antes. Contacta con Nurme para cualquier otra gestión.",contact:"Para modificar esta reserva, contacta directamente con Nurme.",services:"Revisa los servicios seleccionados.",hours:"Elige una hora de lunes a viernes, entre las 09:00 y las 19:00, con al menos 6 horas de antelación.",occupied:"Ese horario acaba de ocuparse. Consulta las horas disponibles otra vez.",invalid:"Revisa los datos introducidos."};
function reply(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T12:00:00Z"))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;}

export async function customerBookingRoute(request:Request,env:CalendarConfig){
  const url=new URL(request.url);
  if(url.origin!==ORIGIN||request.headers.get("origin")!==ORIGIN)return reply({error:"Solicitud no válida."},403);
  if(request.method!=="POST")return reply({error:"Método no permitido."},405);
  if(!env.SUPABASE_SECRET_KEY||!env.GOOGLE_CALENDAR_ENCRYPTION_KEY)return reply({error:"La gestión online no está disponible. Contacta con Nurme."},503);
  try{
    if(Number(request.headers.get("content-length"))>8192)return reply({error:"Solicitud demasiado grande."},413);
    const raw=await request.text();if(raw.length>8192)return reply({error:"Solicitud demasiado grande."},413);
    const body=JSON.parse(raw) as Record<string,unknown>;
    if(!body||Array.isArray(body))return reply({error:messages.invalid},400);
    const action=String(body.action??"lookup");
    if(!["lookup","slots","cancel","reschedule"].includes(action))return reply({error:messages.invalid},400);
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    const scope=action==="lookup"?"lookup":"manage";
    const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${env.GOOGLE_CALENDAR_ENCRYPTION_KEY}:${scope}:${ip}`));
    const key=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
    const allowed=await db<boolean>(env,"rpc/consume_booking_management_attempt","POST",{p_key:key,p_limit:action==="lookup"?12:120});
    if(!allowed)return reply({error:"Demasiados intentos. Espera 15 minutos y vuelve a probar."},429);
    let reference:string,phone:string;
    if(action==="lookup"){
      reference=typeof body.reference==="string"?body.reference.trim().toUpperCase():"";
      phone=typeof body.phone==="string"?body.phone.replace(/\D/g,""):"";
      if(!/^[A-Z]{2}-[A-Z0-9]{6}$/.test(reference)||!/^\d{9,15}$/.test(phone))return reply({error:messages.not_found},400);
    }else{
      try{
        if(typeof body.token!=="string"||body.token.length>2048)throw new Error();
        const session=JSON.parse(await unseal(body.token,env)) as {purpose:string;expires:number;reference:string;phone:string};
        if(session.purpose!=="customer-booking"||session.expires<Date.now()||!Number.isFinite(session.expires))throw new Error();
        reference=session.reference;phone=session.phone;
      }catch{return reply({error:"La consulta ha caducado. Introduce de nuevo tu código y teléfono."},401);}
    }
    const params:Record<string,unknown>={p_reference:reference,p_phone:phone,p_action:action};
    if(action==="slots"){
      if(typeof body.date!=="string"||!validDate(body.date))return reply({error:messages.invalid},400);
      params.p_date=body.date;
    }
    if(action==="reschedule"){
      if(typeof body.startsAt!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(body.startsAt)||!validDate(body.startsAt.slice(0,10)))return reply({error:messages.invalid},400);
      params.p_starts_at=body.startsAt;
    }
    if(["slots","reschedule"].includes(action)&&body.serviceIds!==undefined){
      if(!Array.isArray(body.serviceIds)||!body.serviceIds.length||body.serviceIds.length>12||body.serviceIds.some(s=>typeof s!=="string"||s.length>100))return reply({error:messages.services},400);
      params.p_service_ids=[...new Set(body.serviceIds)];
    }
    if(["cancel","reschedule"].includes(action)){
      if(typeof body.version!=="string"||!/^[a-f0-9]{32}$/.test(body.version))return reply({error:messages.changed},409);
      params.p_version=body.version;
    }
    const result=await db<Record<string,unknown>>(env,"rpc/manage_customer_booking","POST",params);
    if(result.error)return reply({error:messages[String(result.error)]||messages.invalid,code:result.error},result.error==="not_found"?404:409);
    if(action==="lookup")result.token=await seal(JSON.stringify({purpose:"customer-booking",reference,phone,expires:Date.now()+30*60*1000}),env);
    const response=reply(result);
    if(action==="cancel"||action==="reschedule")response.headers.set("X-MB-Booking-Changed","1");
    return response;
  }catch{return reply({error:"No se ha podido completar la gestión. Inténtalo de nuevo o contacta con Nurme."},502);}
}
