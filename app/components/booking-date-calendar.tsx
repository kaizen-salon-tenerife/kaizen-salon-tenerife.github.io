"use client";

import { useState } from "react";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function BookingDateCalendar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const [month, setMonth] = useState(() => new Date(`${value || today}T12:00:00`));
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(first);
  const selectedLabel = value ? new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)) : "Selecciona un día de lunes a viernes";
  function moveMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1, 12));
  }

  return <section className="booking-calendar" aria-label="Calendario para elegir el día de la cita">
    <header><button type="button" aria-label="Mes anterior" disabled={dateKey(first).slice(0, 7) <= today.slice(0, 7)} onClick={() => moveMonth(-1)}>←</button><strong aria-live="polite">{monthLabel}</strong><button type="button" aria-label="Mes siguiente" onClick={() => moveMonth(1)}>→</button></header>
    <div className="booking-calendar-grid">
      {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => <span key={index} className="booking-calendar-weekday" aria-hidden="true">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
      {Array.from({ length: count }, (_, index) => {
        const date = new Date(month.getFullYear(), month.getMonth(), index + 1, 12);
        const key = dateKey(date);
        const closed = [0, 6].includes(date.getDay());
        const past = key < today;
        const label = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
        return <button type="button" key={key} disabled={past || closed} aria-label={`${label}${closed ? ", cerrado" : past ? ", fecha pasada" : ""}`} aria-pressed={value === key} aria-current={key === today ? "date" : undefined} onClick={() => onChange(key)}>{index + 1}</button>;
      })}
    </div>
    <p className="booking-calendar-selection" aria-live="polite">{value ? "Día elegido: " : ""}{selectedLabel}</p>
    <small>Sábados y domingos cerrado.</small>
  </section>;
}
