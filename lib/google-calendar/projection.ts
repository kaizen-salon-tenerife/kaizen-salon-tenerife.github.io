export type CalendarAppointment = {
  id: string; professional_key: string; service_name: string;
  starts_at: string; ends_at: string; status: string; updated_at: string;
  notes?: string | null; client?: { name: string } | null;
};
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
export function eventId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid appointment ID");
  return "mb" + id.replaceAll("-", "").toLowerCase();
}
export function serviceColor(name: string) {
  const value = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/pedicura/.test(value)) return "10";
  if (/facial|higiene|radiofrecuencia/.test(value)) return "9";
  if (/ceja|pestana|lash|brow|lifting|lamina|henna/.test(value)) return "3";
  if (/manicura|una|softgel|acrilic/.test(value)) return "4";
  return "8";
}
export function shouldPublish(a: CalendarAppointment) {
  return a.professional_key === "nurme" && ["confirmed", "completed"].includes(a.status);
}
export function projectEvent(a: CalendarAppointment) {
  // Existing agenda stores the studio's wall-clock time in its timestamp fields.
  // Google resolves these local times with Tenerife DST rules, not the server's timezone.
  return {
    id: eventId(a.id), summary: (a.client?.name?.trim() || "Clienta") + " · " + a.service_name,
    description: [
      "Cita de Nurme. Gestionar cambios y cancelaciones desde el panel de MB Beauty.",
      a.notes?.trim() ? "Notas de la cita:\n" + a.notes.trim() : "",
    ].filter(Boolean).join("\n\n"),
    start: { dateTime: a.starts_at.slice(0, 19), timeZone: "Atlantic/Canary" },
    end: { dateTime: a.ends_at.slice(0, 19), timeZone: "Atlantic/Canary" },
    colorId: serviceColor(a.service_name), status: "confirmed", visibility: "private", transparency: "opaque",
    extendedProperties: { private: { mbBeautyAppointment: a.id } },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
  };
}
