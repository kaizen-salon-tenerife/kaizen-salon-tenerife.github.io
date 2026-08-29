import { redirect } from "next/navigation";
import { getPanelData } from "@/lib/panel-data";
import {
  getCurrentStaffAccessToken,
  getCurrentStaffUser,
} from "@/lib/staff-auth";
import PanelClient from "./panel-client";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const [user, accessToken] = await Promise.all([
    getCurrentStaffUser({ allowPasswordChange: true }),
    getCurrentStaffAccessToken(),
  ]);
  if (!user || !accessToken) redirect("/panel/acceso");
  if (user.mustChangePassword) redirect("/panel/cambiar-clave");

  const data = await getPanelData(user, accessToken);
  return (
    <PanelClient
      currentUser={user}
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
