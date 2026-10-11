import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/staff-auth";
import CalendarConnection from "./connection";
export const dynamic = "force-dynamic";
export default async function GoogleCalendarPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const user = await getCurrentStaffUser();
  if (!user) redirect("/panel/acceso");
  if (!["nurme", "adminleon"].includes(user.professionalKey)) redirect("/panel");
  return <main className="shell mb-section"><Link className="mb-text-link" href="/panel">← Volver al panel</Link><p className="mb-eyebrow">Tu agenda también en el móvil</p><h1>Google Calendar</h1><p>Las citas confirmadas de Nurme se enviarán a un calendario privado llamado «Citas MB Beauty».</p><p>Los cambios y cancelaciones se gestionan desde el panel. Las solicitudes pendientes aún no aparecen en Google.</p><CalendarConnection outcome={result} /><h2>Colores por servicio</h2><p>🌸 Manicura · 🌿 Pedicura · 🔵 Facial · 🟣 Cejas y pestañas · Gris para otros servicios.</p><h2>En el iPhone</h2><ol><li>Instala Google Calendar e inicia sesión con la cuenta que has conectado.</li><li>Activa «Citas MB Beauty» en la lista de calendarios.</li><li>Mantén pulsada la pantalla de inicio, elige añadir un widget y selecciona Google Calendar.</li></ol><p>La apariencia de los colores depende del widget y de la versión de iOS.</p></main>;
}
