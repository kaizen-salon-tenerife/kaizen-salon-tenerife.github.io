"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SERVICE_DEFINITIONS,
  formatServiceDuration,
  type ServiceDefinition,
} from "@/lib/service-definitions";

type BookingService = Pick<
  ServiceDefinition,
  "id" | "category" | "name" | "durationMinutes" | "durationLabel" | "priceLabel" | "professionalKey" | "sortOrder"
>;

type AvailabilitySlot = {
  time: string;
  startsAt: string;
  endsAt: string;
  schedule: Array<{
    professionalKey: string;
    professionalName: string;
    startsAt: string;
    endsAt: string;
    serviceNames: string[];
  }>;
};

type AvailabilityResult = {
  slots: AvailabilitySlot[];
  message?: string | null;
  professionals?: Array<{
    key: string;
    name: string;
    serviceNames: string[];
    durationMinutes: number;
  }>;
};

const categoryPrices: Record<string, string> = {
  "Manicura y uñas": "20–35 € aprox.",
  Pedicura: "15–25 € aprox.",
  Faciales: "40–50 € aprox.",
  "Cejas y pestañas": "5–50 € aprox.",
  Micropigmentación: "Precio a consultar",
  Tatuajes: "Precio a consultar",
};

const categoryLabels: Record<string, string> = {
  "Manicura y uñas": "Manicuras",
};

function groupServices(items: BookingService[]) {
  return Object.keys(categoryPrices).map((name) => ({
    name,
    price: categoryPrices[name],
    items: items
      .filter((service) => service.category === name)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}

const fallbackCategories = groupServices(
  DEFAULT_SERVICE_DEFINITIONS.filter((service) => service.isActive),
);

const professionals = [
  { key: "any", name: "Asignación automática", detail: "La mejor combinación disponible" },
  { key: "sarai", name: "Sarai", detail: "Estética y micropigmentación" },
  { key: "yeroha", name: "Yeroha", detail: "Tatuajes" },
  { key: "nurme", name: "Nurme", detail: "Uñas, faciales, cejas y pestañas" },
];

function getLocalDayOfWeek(dateValue: string) {
  if (!dateValue) return null;

  const [year, month, date] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, date).getDay();
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [professional, setProfessional] = useState("any");
  const [day, setDay] = useState("");
  const [availability, setAvailability] = useState<AvailabilityResult>({ slots: [] });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [waitlist, setWaitlist] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [categories, setCategories] = useState(fallbackCategories);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [requestId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingReference, setBookingReference] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/services")
      .then(async (response) => {
        if (!response.ok) throw new Error("Service catalog unavailable");
        return response.json() as Promise<{ services: BookingService[] }>;
      })
      .then((result) => {
        if (active && result.services.length) {
          setCategories(groupServices(result.services));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const allServices = useMemo(
    () => categories.flatMap((category) => category.items),
    [categories],
  );
  const selectedServices = useMemo(
    () => selected
      .map((id) => allServices.find((service) => service.id === id))
      .filter((service): service is BookingService => Boolean(service)),
    [allServices, selected],
  );
  const selectedText = selectedServices.length
    ? selectedServices.map((service) => service.name).join(", ")
    : "Ningún servicio seleccionado";

  const selectedDuration = useMemo(() => {
    return selectedServices.reduce(
      (total, service) => total + service.durationMinutes,
      0,
    );
  }, [selectedServices]);

  const requiredProfessionalKeys = useMemo(
    () => new Set(selectedServices.map((service) => service.professionalKey)),
    [selectedServices],
  );
  const effectiveProfessional =
    professional === "any" ||
    (requiredProfessionalKeys.size === 1 &&
      requiredProfessionalKeys.has(professional as BookingService["professionalKey"]))
      ? professional
      : "any";

  const selectedWeekday = getLocalDayOfWeek(day);
  const isSaturday = selectedWeekday === 6;
  const isSunday = selectedWeekday === 0;

  useEffect(() => {
    if (!day || selected.length === 0) return;
    if (isSunday) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      date: day,
      services: selected.join(","),
      professional: effectiveProfessional,
    });

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(true);
        return fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
        });
      })
      .then(async (response) => {
        const result = (await response.json()) as AvailabilityResult & { error?: string };
        if (!response.ok) throw new Error(result.error || "No se pudo consultar la agenda.");
        return result;
      })
      .then((result) => {
        setAvailability(result);
        setAvailabilityError(result.message ?? "");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "No se pudo consultar la agenda. Inténtalo de nuevo.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [availabilityRevision, day, effectiveProfessional, isSunday, selected]);

  const selectedProfessionalName =
    professionals.find((person) => person.key === effectiveProfessional)?.name ??
    "Asignación automática";
  const selectedScheduleText = selectedSlot
    ? selectedSlot.schedule
        .map(
          (segment) =>
            `${segment.startsAt.slice(11, 16)}–${segment.endsAt.slice(11, 16)} ${segment.professionalName}`,
        )
        .join(" · ")
    : "";

  const whatsappUrl = useMemo(() => {
    const message = [
      "Hola Kaizen, tengo una cita confirmada desde la web.",
      "Nombre: " + (name || "Por completar"),
      "WhatsApp: " + (phone || "Por completar"),
      "Servicios: " + selectedText,
      "Asignación: " + selectedProfessionalName,
      "Fecha: " + (day || "Por completar"),
      "Hora disponible: " + (selectedSlot?.time ?? "Por completar"),
      selectedScheduleText ? "Plan: " + selectedScheduleText : "",
      bookingReference ? "Referencia: " + bookingReference : "",
      waitlist ? "Acepto entrar en la lista de espera." : "",
      notes ? "Notas: " + notes : "",
    ]
      .filter(Boolean)
      .join("\n");

    return "https://wa.me/34639384727?text=" + encodeURIComponent(message);
  }, [bookingReference, day, name, notes, phone, selectedProfessionalName, selectedScheduleText, selectedSlot, selectedText, waitlist]);

  function toggleService(serviceId: string) {
    clearAvailability();
    setSelected((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
  }

  function clearAvailability(error = "") {
    setSelectedSlot(null);
    setAvailability({ slots: [] });
    setAvailabilityError(error);
    setAvailabilityLoading(false);
  }

  function selectDay(value: string) {
    setDay(value);
    clearAvailability(
      getLocalDayOfWeek(value) === 0
        ? "Kaizen permanece cerrado los domingos. Elige otro día."
        : "",
    );
  }

  function selectProfessional(value: string) {
    setProfessional(value);
    clearAvailability();
  }

  function next() {
    if (step < 4) setStep((current) => current + 1);
  }

  function back() {
    if (step > 1) setStep((current) => current - 1);
  }

  async function submitBookingRequest() {
    if (!selectedSlot || submitting || bookingReference) return;
    setSubmitting(true);
    setBookingError("");

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          serviceIds: selected,
          preferredProfessional: effectiveProfessional,
          startsAt: selectedSlot.startsAt,
          name,
          phone,
          notes,
          waitlist,
          privacyAccepted,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        reference?: string;
      };
      if (!response.ok) {
        if (result.code === "slot_unavailable") {
          setStep(2);
          clearAvailability(result.error ?? "Esa hora ya no está disponible.");
          setAvailabilityRevision((current) => current + 1);
          return;
        }
        setBookingError(result.error ?? "No se ha podido confirmar la cita.");
        return;
      }

      setBookingReference(result.reference ?? "KZ-GUARDADA");
    } catch {
      setBookingError(
        "No hemos podido conectar con Kaizen. Comprueba tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-page">
      <header className="booking-header">
        <div className="booking-shell booking-header-inner">
          <Link className="booking-brand" href="/">
            <Image
              src="/logo-kaizen.png"
              alt="Kaizen"
              width={52}
              height={52}
              unoptimized
            />
            <span><strong>Kaizen</strong><small>Reserva de cita</small></span>
          </Link>
          <Link className="booking-close" href="/" aria-label="Cerrar y volver al inicio">
            ×
          </Link>
        </div>
      </header>

      <div className="booking-shell booking-layout">
        <aside className="booking-aside">
          <p className="booking-kicker">Tu cita, paso a paso</p>
          <h1>Cuéntanos qué necesitas.</h1>
          <p>
            No necesitas crear una cuenta. Al terminar, tu cita quedará
            confirmada directamente en la agenda de Kaizen.
          </p>
          <ol className="steps" aria-label="Progreso de la reserva">
            {["Servicios", "Preferencias", "Tus datos", "Confirmación"].map(
              (label, index) => {
                const number = index + 1;
                return (
                  <li
                    className={step === number ? "active" : step > number ? "done" : ""}
                    key={label}
                  >
                    <span>{step > number ? "✓" : number}</span>
                    <div><strong>{label}</strong><small>Paso {number} de 4</small></div>
                  </li>
                );
              },
            )}
          </ol>
          <a
            className="help-link"
            href="https://wa.me/34639384727?text=Hola%20Kaizen%2C%20necesito%20ayuda%20para%20reservar%20una%20cita."
            target="_blank"
            rel="noreferrer"
          >
            ¿Necesitas ayuda? Escríbenos
          </a>
        </aside>

        <section className="booking-card" aria-live="polite">
          {step === 1 && (
            <>
              <div className="booking-card-heading">
                <span>Paso 1</span>
                <h2>¿Qué servicios quieres reservar?</h2>
                <p>Puedes elegir más de uno para hacerlos seguidos.</p>
              </div>
              <div className="category-list">
                {categories.map((category) => (
                  <section className="category-block" key={category.name}>
                    <div className="category-heading">
                      <h3>{categoryLabels[category.name] ?? category.name}</h3>
                      <span className="category-price">{category.price}</span>
                    </div>
                    <div className="service-options">
                      {category.items.map((service) => {
                        const isSelected = selected.includes(service.id);
                        return (
                          <button
                            className={isSelected ? "service-option selected" : "service-option"}
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            type="button"
                            aria-pressed={isSelected}
                          >
                            <span>
                              <strong>{service.name}</strong>
                              <em>{service.priceLabel} · {service.durationLabel}</em>
                            </span>
                            <small>{isSelected ? "Añadido" : "Añadir"}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              {selectedDuration > 0 && (
                <div className="booking-duration-summary" role="status">
                  <span>Tiempo reservado aproximado</span>
                  <strong>{formatServiceDuration(selectedDuration)}</strong>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="booking-card-heading">
                <span>Paso 2</span>
                <h2>Elige una hora disponible.</h2>
                <p>
                  Tus servicios necesitan aproximadamente {formatServiceDuration(selectedDuration)}.
                  Solo verás horas en las que todo el tratamiento cabe antes del cierre.
                </p>
              </div>

              <fieldset className="booking-fieldset">
                <legend>Profesional</legend>
                <div className="choice-grid">
                  {professionals.map((person) => (
                    <label
                      className={`${effectiveProfessional === person.key ? "choice selected" : "choice"}${
                        person.key !== "any" &&
                        (requiredProfessionalKeys.size !== 1 ||
                          !requiredProfessionalKeys.has(person.key as BookingService["professionalKey"]))
                          ? " disabled"
                          : ""
                      }`}
                      key={person.key}
                    >
                      <input
                        type="radio"
                        name="professional"
                        value={person.key}
                        checked={effectiveProfessional === person.key}
                        disabled={
                          person.key !== "any" &&
                          (requiredProfessionalKeys.size !== 1 ||
                            !requiredProfessionalKeys.has(person.key as BookingService["professionalKey"]))
                        }
                        onChange={(event) => selectProfessional(event.target.value)}
                      />
                      <span><strong>{person.name}</strong><small>{person.detail}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="booking-date-row">
                <label className="field booking-date-field">
                  <span>Día preferido</span>
                  <input
                    type="date"
                    value={day}
                    min={new Date().toLocaleDateString("en-CA")}
                    onChange={(event) => selectDay(event.target.value)}
                  />
                </label>
                <div className="booking-hours-card">
                  <small>Horario del día</small>
                  <strong>{isSunday ? "Cerrado" : isSaturday ? "09:30–13:30" : "09:30–18:00"}</strong>
                </div>
              </div>

              {availabilityError ? (
                <p className="booking-availability-error" role="alert">
                  {availabilityError}
                </p>
              ) : isSaturday ? (
                <p className="booking-hours-note">
                  El sistema descarta automáticamente cualquier cita que terminase después de las 13:30.
                </p>
              ) : null}

              {availabilityLoading ? (
                <div className="availability-loading" role="status">
                  <span aria-hidden="true" /> Comprobando la agenda…
                </div>
              ) : availability.slots.length > 0 ? (
                <section className="availability-results" aria-label="Horas disponibles">
                  <div className="availability-heading">
                    <div>
                      <small>Horas disponibles</small>
                      <strong>Selecciona la hora de inicio</strong>
                    </div>
                    <span>{availability.slots.length} opciones</span>
                  </div>
                  <div className="time-slot-grid">
                    {availability.slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.startsAt}
                        className={selectedSlot?.startsAt === slot.startsAt ? "time-slot selected" : "time-slot"}
                        onClick={() => setSelectedSlot(slot)}
                        aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                      >
                        <strong>{slot.time}</strong>
                        <small>hasta {slot.endsAt.slice(11, 16)}</small>
                      </button>
                    ))}
                  </div>
                  {selectedSlot && (
                    <div className="selected-slot-plan" role="status">
                      <span>Tu cita quedaría así</span>
                      {selectedSlot.schedule.map((segment) => (
                        <p key={`${segment.professionalKey}-${segment.startsAt}`}>
                          <strong>{segment.startsAt.slice(11, 16)}–{segment.endsAt.slice(11, 16)}</strong>
                          <span>{segment.professionalName} · {segment.serviceNames.join(", ")}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </section>
              ) : !day ? (
                <p className="availability-prompt">Elige una fecha para ver sus horas libres.</p>
              ) : null}

              {availability.professionals && availability.professionals.length > 1 && (
                <p className="multi-professional-note">
                  Como elegiste servicios de profesionales distintas, buscamos un hueco seguido para atenderte sin esperas.
                </p>
              )}

              <label className="waitlist-choice">
                <input
                  type="checkbox"
                  checked={waitlist}
                  onChange={(event) => setWaitlist(event.target.checked)}
                />
                <span>
                  <strong>Avisarme si aparece un hueco antes</strong>
                  <small>
                    Recibirás una propuesta por WhatsApp y tendrás una hora para aceptarla.
                  </small>
                </span>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <div className="booking-card-heading">
                <span>Paso 3</span>
                <h2>¿Cómo podemos contactarte?</h2>
                <p>Utilizaremos estos datos únicamente para gestionar tu cita.</p>
              </div>
              <div className="contact-form">
                <label className="field">
                  <span>Nombre y apellidos</span>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span>Número de WhatsApp</span>
                  <input
                    type="tel"
                    placeholder="Ej. 600 000 000"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label className="field field-full">
                  <span>Notas para el equipo <small>(opcional)</small></span>
                  <textarea
                    placeholder="Cuéntanos cualquier detalle que debamos saber."
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <p className="privacy-note">
                  Las fotografías son opcionales y siempre se solicitará una
                  autorización independiente al finalizar el tratamiento.
                </p>
                <label className="privacy-consent field-full">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  />
                  <span>
                    Acepto que Kaizen utilice mis datos para gestionar esta cita.
                    He leído el <Link href="/privacidad" target="_blank" rel="noreferrer">aviso de privacidad</Link>.
                  </span>
                </label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              {bookingReference ? (
                <div className="booking-success" role="status">
                  <span className="booking-success-check">✓</span>
                  <small>Cita registrada</small>
                  <h2>Tu cita está confirmada.</h2>
                  <p>
                    La hemos añadido directamente a la agenda de Kaizen. Si el
                    centro necesita hacer algún cambio, se pondrá en contacto contigo.
                  </p>
                  <div className="booking-reference">
                    <span>Referencia</span>
                    <strong>{bookingReference}</strong>
                  </div>
                </div>
              ) : (
                <>
                  <div className="booking-card-heading">
                    <span>Paso 4</span>
                    <h2>Revisa tu cita.</h2>
                    <p>Al confirmar, quedará reservada directamente en la agenda.</p>
                  </div>
                  <div className="booking-summary">
                    <div><small>Servicios</small><strong>{selectedText}</strong></div>
                    <div><small>Asignación</small><strong>{selectedProfessionalName}</strong></div>
                    <div><small>Fecha y hora</small><strong>{day || "Sin fecha"} · {selectedSlot?.time ?? "Sin hora"}</strong></div>
                    <div><small>Contacto</small><strong>{name || "Sin nombre"} · {phone || "Sin teléfono"}</strong></div>
                    {selectedSlot && selectedSlot.schedule.length > 1 && (
                      <div className="summary-highlight">
                        <small>Plan del equipo</small>
                        <strong>{selectedScheduleText}</strong>
                      </div>
                    )}
                    {waitlist && (
                      <div className="summary-highlight">
                        <small>Lista de espera</small>
                        <strong>Sí, quiero recibir propuestas compatibles</strong>
                      </div>
                    )}
                  </div>
                  <div className="confirmation-box">
                    <span>✓</span>
                    <p>
                      Al confirmar, la cita aparecerá inmediatamente en la agenda de
                      Kaizen como confirmada y ese horario dejará de estar disponible.
                    </p>
                  </div>
                  {bookingError && (
                    <p className="booking-availability-error" role="alert">{bookingError}</p>
                  )}
                </>
              )}
            </>
          )}

          <div className="booking-footer-actions">
            {bookingReference ? (
              <Link className="booking-back" href="/">Volver al inicio</Link>
            ) : step > 1 ? (
              <button className="booking-back" type="button" onClick={back}>
                ← Volver
              </button>
            ) : (
              <Link className="booking-back" href="/">← Volver al inicio</Link>
            )}
            {step < 4 ? (
              <button
                className="button button-gold booking-next"
                type="button"
                onClick={next}
                disabled={
                  (step === 1 && selected.length === 0) ||
                  (step === 2 && (!selectedSlot || availabilityLoading || Boolean(availabilityError))) ||
                  (step === 3 && (!name || !phone || !privacyAccepted))
                }
              >
                Continuar →
              </button>
            ) : bookingReference ? (
              <a
                className="button button-gold booking-next"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                Escribir a Kaizen →
              </a>
            ) : (
              <button
                className="button button-gold booking-next"
                type="button"
                onClick={submitBookingRequest}
                disabled={submitting || !selectedSlot || !privacyAccepted}
              >
                {submitting ? "Confirmando…" : "Confirmar cita →"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
