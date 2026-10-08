"use client";

import { useMemo, useState, type CSSProperties } from "react";

export type AppointmentRow = {
  id: string;
  client: string;
  clientId: string;
  clientPhone: string;
  clientEmail: string;
  service: string;
  professionalId: string;
  professional: string;
  bookingRequestId: string | null;
  waitlist: boolean | null;
  startsAt: string;
  endsAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  statusReason: string;
  completedAt: string | null;
  notes: string;
  holdExpiresAt: string | null;
  treatmentRecordId: string | null;
  paymentId: string | null;
};

export type ScheduleBlockRow = {
  id: string;
  professionalId: string | null;
  professional: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
};

export type AgendaProfessional = {
  id: string;
  name: string;
  professionalKey: string;
};

type CalendarMode = "day" | "week" | "month";

const OPENING_MINUTE = 9 * 60 + 30;
const CLOSING_MINUTE = 18 * 60;
const SLOT_HEIGHT = 52;
const DAY_HEIGHT = ((CLOSING_MINUTE - OPENING_MINUTE) / 30) * SLOT_HEIGHT;

export default function AgendaWorkspace({
  appointments,
  blocks,
  professionals,
  isOwner,
  selectedProfessionalId,
  setSelectedProfessionalId,
  onSelectAppointment,
  onDeleteBlock,
  onNewBlock,
  onCloseDay,
}: {
  appointments: AppointmentRow[];
  blocks: ScheduleBlockRow[];
  professionals: AgendaProfessional[];
  isOwner: boolean;
  selectedProfessionalId: string;
  setSelectedProfessionalId: (id: string) => void;
  onSelectAppointment: (appointment: AppointmentRow) => void;
  onDeleteBlock: (block: ScheduleBlockRow) => void;
  onNewBlock: () => void;
  onCloseDay: () => void;
}) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState(todayKey);

  const filteredAppointments = useMemo(
    () => appointments.filter((item) =>
      selectedProfessionalId === "all" || item.professionalId === selectedProfessionalId,
    ),
    [appointments, selectedProfessionalId],
  );
  const filteredBlocks = useMemo(
    () => blocks.filter((item) =>
      item.professionalId === null || selectedProfessionalId === "all" || item.professionalId === selectedProfessionalId,
    ),
    [blocks, selectedProfessionalId],
  );

  const days = mode === "day"
    ? [anchor]
    : Array.from({ length: 6 }, (_, index) => addDays(startOfWeek(anchor), index));
  const periodAppointments = filteredAppointments.filter((item) =>
    item.status !== "cancelled" && isInCurrentPeriod(item.startsAt.slice(0, 10), anchor, mode),
  );

  function move(direction: number) {
    if (mode === "day") setAnchor(addDays(anchor, direction));
    if (mode === "week") setAnchor(addDays(anchor, direction * 7));
    if (mode === "month") setAnchor(addMonths(anchor, direction));
  }

  return (
    <section className="panel-card agenda-workspace">
      <div className="agenda-toolbar">
        <div>
          <small>Horario oficial de MB Beauty</small>
          <h2>{rangeTitle(anchor, mode)}</h2>
          <p>L–V 09:30–18:00 · Sáb 09:30–13:30 · Dom cerrado</p>
        </div>
        <div className="agenda-toolbar-actions">
          {isOwner && <button className="panel-secondary close-day-button" type="button" onClick={onCloseDay}>Cerrar día</button>}
          <button className="panel-secondary block-time-button" type="button" onClick={onNewBlock}>Bloquear horario</button>
          <div className="calendar-mode-switch" aria-label="Vista de agenda">
            {(["day", "week", "month"] as CalendarMode[]).map((item) => (
              <button className={mode === item ? "active" : ""} type="button" onClick={() => setMode(item)} key={item}>
                {{ day: "Día", week: "Semana", month: "Mes" }[item]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="agenda-subtoolbar">
        <div className="calendar-navigation">
          <button type="button" onClick={() => move(-1)} aria-label="Periodo anterior">←</button>
          <button type="button" onClick={() => setAnchor(todayKey())}>Hoy</button>
          <button type="button" onClick={() => move(1)} aria-label="Periodo siguiente">→</button>
        </div>
        {isOwner && (
          <div className="professional-filter calendar-professional-filter">
            <button className={selectedProfessionalId === "all" ? "active" : ""} type="button" onClick={() => setSelectedProfessionalId("all")}>Todas</button>
            {professionals.map((item) => (
              <button className={selectedProfessionalId === item.id ? "active" : ""} type="button" onClick={() => setSelectedProfessionalId(item.id)} key={item.id}>{item.name}</button>
            ))}
          </div>
        )}
        <span className="calendar-period-count">{periodAppointments.length} {periodAppointments.length === 1 ? "cita" : "citas"}</span>
      </div>

      {mode === "month" ? (
        <MonthGrid
          anchor={anchor}
          appointments={filteredAppointments}
          blocks={filteredBlocks}
          onSelectDay={(date) => { setAnchor(date); setMode("day"); }}
        />
      ) : (
        <TimeGrid
          days={days}
          appointments={filteredAppointments}
          blocks={filteredBlocks}
          onSelectAppointment={onSelectAppointment}
          onDeleteBlock={onDeleteBlock}
        />
      )}

      <div className="calendar-legend">
        {professionals.map((item) => <span key={item.id}><i className={`legend-${item.professionalKey}`} />{item.name}</span>)}
        <span><i className="legend-block" />Horario bloqueado</span>
        <small>Pulsa una cita para modificarla o cambiar su estado.</small>
      </div>
    </section>
  );
}

function TimeGrid({
  days,
  appointments,
  blocks,
  onSelectAppointment,
  onDeleteBlock,
}: {
  days: string[];
  appointments: AppointmentRow[];
  blocks: ScheduleBlockRow[];
  onSelectAppointment: (appointment: AppointmentRow) => void;
  onDeleteBlock: (block: ScheduleBlockRow) => void;
}) {
  const times = Array.from(
    { length: (CLOSING_MINUTE - OPENING_MINUTE) / 30 + 1 },
    (_, index) => minutesLabel(OPENING_MINUTE + index * 30),
  );

  return (
    <div className="calendar-scroll">
      <div className="calendar-time-grid" style={{ "--calendar-days": days.length } as CSSProperties}>
        <div className="calendar-corner">Hora</div>
        {days.map((day) => (
          <div className={`calendar-day-heading ${day === todayKey() ? "today" : ""}`} key={`head-${day}`}>
            <small>{weekday(day)}</small><strong>{dayNumber(day)}</strong><span>{shortMonth(day)}</span>
          </div>
        ))}
        <div className="calendar-time-labels" style={{ height: DAY_HEIGHT }}>
          {times.map((time, index) => <span style={{ top: index * SLOT_HEIGHT }} key={time}>{time}</span>)}
        </div>
        {days.map((day) => {
          const dayAppointments = appointments.filter((item) => item.startsAt.slice(0, 10) === day);
          const dayBlocks = blocks.filter((item) => overlapsDay(item, day));
          const allDayBlocks = dayBlocks.filter((item) => item.isAllDay);
          const partialBlocks = dayBlocks.filter((item) => !item.isAllDay);
          const professionalIds = Array.from(new Set([
            ...dayAppointments.map((item) => item.professionalId),
            ...dayBlocks.map((item) => item.professionalId).filter((id): id is string => Boolean(id)),
          ]));
          const closingMinute = openingHours(day)?.end ?? OPENING_MINUTE;
          return (
            <div className={`calendar-day-track ${!openingHours(day) ? "closed" : ""}`} style={{ height: DAY_HEIGHT }} key={day}>
              {closingMinute < CLOSING_MINUTE && (
                <div className="calendar-closed-tail" style={{ top: minuteTop(closingMinute), height: DAY_HEIGHT - minuteTop(closingMinute) }}><span>Cerrado</span></div>
              )}
              {allDayBlocks.map((block) => (
                <button className={`calendar-all-day-block ${block.professionalId === null ? "center-closure" : ""}`} style={block.professionalId ? laneStyle(block.professionalId, professionalIds) : fullLaneStyle()} type="button" onClick={() => onDeleteBlock(block)} title="Pulsa para eliminar el bloqueo" key={block.id}>
                  <strong>{block.title}</strong><span>{block.professional} · todo el día</span>
                </button>
              ))}
              {partialBlocks.map((block) => (
                <button
                  className="calendar-event calendar-block-event"
                  style={{ ...eventStyle(block.startsAt, block.endsAt, day), ...(block.professionalId ? laneStyle(block.professionalId, professionalIds) : fullLaneStyle()) }}
                  type="button"
                  onClick={() => onDeleteBlock(block)}
                  title="Pulsa para eliminar el bloqueo"
                  key={block.id}
                >
                  <strong>{block.title}</strong><span>{formatTime(block.startsAt)}–{formatTime(block.endsAt)}</span><small>{block.professional}</small>
                </button>
              ))}
              {dayAppointments.map((appointment) => (
                <button
                  className={`calendar-event calendar-appointment mark-card-${slug(appointment.professional)} status-card-${appointment.status}`}
                  style={{ ...eventStyle(appointment.startsAt, appointment.endsAt, day), ...laneStyle(appointment.professionalId, professionalIds) }}
                  type="button"
                  onClick={() => onSelectAppointment(appointment)}
                  key={appointment.id}
                >
                  <span>{formatTime(appointment.startsAt)} · {appointment.professional}</span>
                  <strong>{appointment.client}</strong>
                  <small>{appointment.service}{appointment.bookingRequestId ? " · Web" : ""}</small>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  appointments,
  blocks,
  onSelectDay,
}: {
  anchor: string;
  appointments: AppointmentRow[];
  blocks: ScheduleBlockRow[];
  onSelectDay: (date: string) => void;
}) {
  const first = `${anchor.slice(0, 7)}-01`;
  const gridStart = addDays(first, -((utcDay(first) + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return (
    <div className="month-calendar">
      {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <strong className="month-weekday" key={day}>{day}</strong>)}
      {cells.map((day) => {
        const dayAppointments = appointments.filter((item) => item.startsAt.slice(0, 10) === day && item.status !== "cancelled");
        const dayBlocks = blocks.filter((item) => overlapsDay(item, day));
        return (
          <button className={`month-day ${day.slice(0, 7) !== anchor.slice(0, 7) ? "outside" : ""} ${day === todayKey() ? "today" : ""}`} type="button" onClick={() => onSelectDay(day)} key={day}>
            <span>{dayNumber(day)}</span>
            {dayAppointments.slice(0, 3).map((item) => <small className={`month-event mark-card-${slug(item.professional)}`} key={item.id}>{formatTime(item.startsAt)} {item.client}</small>)}
            {dayAppointments.length > 3 && <small className="month-more">+{dayAppointments.length - 3} citas</small>}
            {dayBlocks.length > 0 && <small className="month-block">{dayBlocks.length} bloqueo{dayBlocks.length > 1 ? "s" : ""}</small>}
          </button>
        );
      })}
    </div>
  );
}

function eventStyle(start: string, end: string, day: string): CSSProperties {
  const startMinute = start.slice(0, 10) < day ? OPENING_MINUTE : timeMinutes(start.slice(11, 16));
  const endMinute = end.slice(0, 10) > day ? CLOSING_MINUTE : timeMinutes(end.slice(11, 16));
  const top = minuteTop(Math.max(startMinute, OPENING_MINUTE));
  const height = Math.max(34, ((Math.min(endMinute, CLOSING_MINUTE) - Math.max(startMinute, OPENING_MINUTE)) / 30) * SLOT_HEIGHT - 4);
  return { top, height };
}

function laneStyle(professionalId: string, ids: string[]): CSSProperties {
  const count = Math.max(ids.length, 1);
  const lane = Math.max(ids.indexOf(professionalId), 0);
  const width = 100 / count;
  return {
    left: `calc(${lane * width}% + 4px)`,
    width: `calc(${width}% - 8px)`,
  };
}

function fullLaneStyle(): CSSProperties {
  return { left: "4px", width: "calc(100% - 8px)" };
}

function minuteTop(minute: number) {
  return ((minute - OPENING_MINUTE) / 30) * SLOT_HEIGHT;
}

function openingHours(date: string) {
  const day = utcDay(date);
  if (day === 0) return null;
  return { start: OPENING_MINUTE, end: day === 6 ? 13 * 60 + 30 : CLOSING_MINUTE };
}

function overlapsDay(block: ScheduleBlockRow, day: string) {
  return block.startsAt < `${addDays(day, 1)}T00:00:00` && block.endsAt > `${day}T00:00:00`;
}

function isInCurrentPeriod(date: string, anchor: string, mode: CalendarMode) {
  if (mode === "day") return date === anchor;
  if (mode === "week") return date >= startOfWeek(anchor) && date <= addDays(startOfWeek(anchor), 5);
  return date.slice(0, 7) === anchor.slice(0, 7);
}

function rangeTitle(anchor: string, mode: CalendarMode) {
  if (mode === "day") return capitalize(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(parseKey(anchor)));
  if (mode === "month") return capitalize(new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(parseKey(anchor)));
  const start = startOfWeek(anchor);
  const end = addDays(start, 5);
  return `${dayNumber(start)} ${shortMonth(start)} – ${dayNumber(end)} ${shortMonth(end)} ${end.slice(0, 4)}`;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function utcDay(value: string) {
  return parseKey(value).getUTCDay();
}

function startOfWeek(value: string) {
  return addDays(value, -((utcDay(value) + 6) % 7));
}

function addDays(value: string, amount: number) {
  const date = parseKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function addMonths(value: string, amount: number) {
  const date = parseKey(`${value.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

function weekday(value: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" }).format(parseKey(value)).replace(".", "");
}

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" }).format(parseKey(value)).replace(".", "");
}

function dayNumber(value: string) {
  return String(parseKey(value).getUTCDate());
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
