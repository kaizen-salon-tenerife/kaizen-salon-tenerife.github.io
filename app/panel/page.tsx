import { redirect } from "next/navigation";
import { getPanelData } from "@/lib/panel-data";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
} from "@/lib/staff-auth";
import PanelClient from "./panel-client";

export const dynamic = "force-dynamic";

export default async function PanelPage({ searchParams }: { searchParams?: Promise<{ cita?: string }> } = {}) {
  const params = await searchParams;
  const appointmentId = typeof params?.cita === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.cita) ? params.cita : "";
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser({ allowPasswordChange: true }),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) redirect(appointmentId ? `/panel/acceso?cita=${encodeURIComponent(appointmentId)}` : "/panel/acceso");
  if (user.mustChangePassword) redirect("/panel/cambiar-clave");

  const data = await getPanelData(user, accessToken);
  return (
    <PanelClient
      currentUser={user}
      initialAppointmentId={appointmentId}
      initialClients={data.clients}
      initialAppointments={data.appointments}
      initialScheduleBlocks={data.blocks}
      staffAccounts={data.staff}
      initialServices={data.services}
      initialPayments={data.payments}
      initialWhatsappNotifications={data.notifications}
    />
  );
}
