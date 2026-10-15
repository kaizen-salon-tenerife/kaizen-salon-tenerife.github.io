"use client";

import { useRef, useState, type ReactNode } from "react";
import { clientChoiceLabel } from "@/lib/client-identity";

type Service = { id: string; category: string; name: string; priceLabel: string; durationMinutes: number; professionalKey: string; isActive: boolean };
type Prefill = { clientId: string; professionalId: string; serviceName: string; date: string; time?: string; duration: number; notes: string };

export default function AppointmentForm({ services, clients, professionals, prefill, isOwner, error, onSubmit, onCancel, isEditing = false, submitLabel = "Añadir cita", summary, children }: {
  isEditing?: boolean;
  submitLabel?: string;
  summary?: ReactNode;
  children?: ReactNode;
  services: Service[];
  clients: { id: string; name: string; phone?: string; email?: string }[];
  professionals: { id: string; name: string; professionalKey: string }[];
  prefill: Prefill | null;
  isOwner: boolean;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const available = services.filter((service) => service.isActive && professionals.some((person) => person.professionalKey === service.professionalKey));
  const initialServices = available.filter((service) => prefill && ` + ${prefill.serviceName} + `.includes(` + ${service.name} + `));
  const [selectedServices, setSelectedServices] = useState<Service[]>(initialServices);
  const [servicesChanged, setServicesChanged] = useState(false);
  const serviceName = !servicesChanged && prefill?.serviceName ? prefill.serviceName : selectedServices.map((service) => service.name).join(" + ");
  const catalogDuration = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0);
  const [duration, setDuration] = useState(prefill?.duration ?? (initialServices.reduce((sum, service) => sum + service.durationMinutes, 0) || 60));
  const [professionalId, setProfessionalId] = useState(prefill?.professionalId ?? professionals[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const matches = available.filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const categories = [...new Set(matches.map((item) => item.category))];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const durationChoices = [...new Set([...Array.from({ length: 32 }, (_, index) => (index + 1) * 15), duration])].sort((a, b) => a - b);
  function toggleService(item: Service) {
    const next = selectedServices.some((service) => service.id === item.id) ? selectedServices.filter((service) => service.id !== item.id) : [...selectedServices, item];
    setServicesChanged(true);
    setSelectedServices(next);
    setDuration(next.reduce((sum, service) => sum + service.durationMinutes, 0) || 15);
    if (next.length) setProfessionalId(professionals.find((person) => person.professionalKey === next[0].professionalKey)?.id ?? "");
  }
  function closePicker() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="appointment-form-fields" hidden={open}>
        {summary}
        {prefill && !isEditing && <section className="follow-up-prefill-note"><span>Próxima visita recomendada</span><strong>Datos preparados</strong><p>Revisa el servicio, la fecha y la hora antes de confirmar la nueva cita.</p></section>}
        <label className="field"><span>Clienta</span><select name="clientId" required defaultValue={prefill?.clientId ?? ""}><option value="" disabled>Seleccionar</option>{clients.map((client) => <option value={client.id} key={client.id}>{clientChoiceLabel(client, clients)}</option>)}</select></label>
        <div className="field"><span>Servicios</span><input type="hidden" name="serviceName" value={serviceName} /><button className="appointment-service-trigger" type="button" ref={trigger} onClick={() => { setSearch(""); setOpen(true); }} aria-expanded={open}>{selectedServices.length ? `${selectedServices.length} servicio${selectedServices.length === 1 ? "" : "s"} seleccionado${selectedServices.length === 1 ? "" : "s"}` : serviceName || "Seleccionar servicios del catálogo"}<span aria-hidden="true"> ▾</span></button>{selectedServices.length > 0 && <><ul className="appointment-selected-services">{selectedServices.map((service) => <li key={service.id}><span>{service.name}<small>{service.priceLabel} · {service.durationMinutes} min</small></span><button type="button" aria-label={`Quitar ${service.name}`} onClick={() => toggleService(service)}>×</button></li>)}</ul><small>Duración total del catálogo: {catalogDuration} min. Puedes ajustarla abajo.</small></>}</div>
        {isOwner && <label className="field"><span>Profesional</span><select name="professionalId" required value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>{professionals.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>}
        <div className="field-grid">
          <label className="field"><span>Fecha</span><input name="date" required type="date" defaultValue={prefill?.date ?? today} /></label>
          <label className="field"><span>{prefill && !isEditing ? "Hora · elige una" : "Hora"}</span><input name="time" required type="time" min="09:30" max="18:00" step="900" defaultValue={isEditing ? prefill?.time ?? "" : prefill ? "" : "09:30"} /></label>
        </div>
        <label className="field"><span>Duración</span><select name="duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durationChoices.map((minutes) => <option value={minutes} key={minutes}>{minutes < 60 ? `${minutes} minutos` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`}</option>)}</select></label>
        {duration > 480 && <p className="modal-form-error" role="alert">La cita puede durar hasta 8 horas. Ajusta la duración o quita algún servicio.</p>}
        <label className="field"><span>Notas internas</span><textarea name="notes" rows={2} defaultValue={prefill?.notes ?? ""} placeholder="Información útil para la cita" /></label>
        {children}
        {error && <p className="modal-form-error" role="alert">{error}</p>}
        <footer><button type="button" onClick={onCancel}>{isEditing ? "Cerrar" : "Cancelar"}</button><button type="submit" disabled={!serviceName || duration > 480}>{submitLabel}</button></footer>
      </div>
      {open && <section className="appointment-service-picker" aria-label="Catálogo de servicios" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closePicker(); } }}>
        <header><h3>Elegir servicios</h3><button type="button" onClick={closePicker} aria-label="Volver a la cita">←</button></header>
        <label className="field"><span>Buscar servicio</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o categoría" /></label>
        <div className="appointment-service-list">{categories.map((category) => <section key={category}><h4>{category}</h4>{matches.filter((item) => item.category === category).map((item) => <button type="button" key={item.id} aria-pressed={selectedServices.some((service) => service.id === item.id)} disabled={selectedServices.length > 0 && selectedServices[0].professionalKey !== item.professionalKey} onClick={() => toggleService(item)}><strong>{selectedServices.some((service) => service.id === item.id) && "✓ "}{item.name}</strong><small>{item.priceLabel} · {item.durationMinutes} min</small></button>)}</section>)}{!matches.length && <p>No hay servicios disponibles con esa búsqueda.</p>}</div>
        <footer><span>{selectedServices.length} seleccionados · {catalogDuration} min</span><button type="button" onClick={closePicker}>Listo · Volver a la cita</button></footer>
      </section>}
    </form>
  );
}
