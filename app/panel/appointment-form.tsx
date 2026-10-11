"use client";

import { useRef, useState } from "react";

type Service = { id: string; category: string; name: string; priceLabel: string; durationMinutes: number; professionalKey: string; isActive: boolean };
type Prefill = { clientId: string; professionalId: string; serviceName: string; date: string; duration: number; notes: string };

export default function AppointmentForm({ services, clients, professionals, prefill, isOwner, error, onSubmit, onCancel }: {
  services: Service[];
  clients: { id: string; name: string }[];
  professionals: { id: string; name: string; professionalKey: string }[];
  prefill: Prefill | null;
  isOwner: boolean;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const available = services.filter((service) => service.isActive && professionals.some((person) => person.professionalKey === service.professionalKey));
  const initialService = available.find((service) => service.name === prefill?.serviceName);
  const [service, setService] = useState<Service | undefined>(initialService);
  const [duration, setDuration] = useState(prefill?.duration ?? initialService?.durationMinutes ?? 60);
  const [professionalId, setProfessionalId] = useState(prefill?.professionalId ?? professionals[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const matches = available.filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const categories = [...new Set(matches.map((item) => item.category))];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const durationChoices = [...new Set([15, 30, 45, 60, 90, 120, 150, 180, 240, duration])].sort((a, b) => a - b);
  function closePicker() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="appointment-form-fields" hidden={open}>
        {prefill && <section className="follow-up-prefill-note"><span>Próxima visita recomendada</span><strong>Datos preparados</strong><p>Revisa el servicio, la fecha y la hora antes de confirmar la nueva cita.</p></section>}
        <label className="field"><span>Clienta</span><select name="clientId" required defaultValue={prefill?.clientId ?? ""}><option value="" disabled>Seleccionar</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
        <div className="field"><span>Servicio</span><input type="hidden" name="serviceName" value={service?.name ?? ""} /><button className="appointment-service-trigger" type="button" ref={trigger} onClick={() => { setSearch(""); setOpen(true); }} aria-expanded={open}>{service?.name ?? "Seleccionar un servicio del catálogo"}<span aria-hidden="true"> ▾</span></button>{service && <small>{service.priceLabel} · Duración del catálogo: {service.durationMinutes} min</small>}</div>
        {isOwner && <label className="field"><span>Profesional</span><select name="professionalId" required value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>{professionals.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>}
        <div className="field-grid">
          <label className="field"><span>Fecha</span><input name="date" required type="date" defaultValue={prefill?.date ?? today} /></label>
          <label className="field"><span>{prefill ? "Hora · elige una" : "Hora"}</span><input name="time" required type="time" min="09:30" max="18:00" step="900" defaultValue={prefill ? "" : "09:30"} /></label>
        </div>
        <label className="field"><span>Duración</span><select name="duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durationChoices.map((minutes) => <option value={minutes} key={minutes}>{minutes < 60 ? `${minutes} minutos` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`}</option>)}</select></label>
        <label className="field"><span>Notas internas</span><textarea name="notes" rows={2} defaultValue={prefill?.notes ?? ""} placeholder="Información útil para la cita" /></label>
        {error && <p className="modal-form-error" role="alert">{error}</p>}
        <footer><button type="button" onClick={onCancel}>Cancelar</button><button type="submit" disabled={!service}>Añadir cita</button></footer>
      </div>
      {open && <section className="appointment-service-picker" aria-label="Catálogo de servicios" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closePicker(); } }}>
        <header><h3>Elegir un servicio</h3><button type="button" onClick={closePicker} aria-label="Volver a la cita">←</button></header>
        <label className="field"><span>Buscar servicio</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o categoría" /></label>
        <div className="appointment-service-list">{categories.map((category) => <section key={category}><h4>{category}</h4>{matches.filter((item) => item.category === category).map((item) => <button type="button" key={item.id} onClick={() => { setService(item); setDuration(item.durationMinutes); setProfessionalId(professionals.find((person) => person.professionalKey === item.professionalKey)?.id ?? ""); closePicker(); }}><strong>{item.name}</strong><small>{item.priceLabel} · {item.durationMinutes} min</small></button>)}</section>)}{!matches.length && <p>No hay servicios disponibles con esa búsqueda.</p>}</div>
      </section>}
    </form>
  );
}
