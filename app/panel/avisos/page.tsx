import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaffUser } from "@/lib/staff-auth";
import Alerts from "./settings";
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{result?:string}>}) {
  const user=await getCurrentStaffUser();
  if (!user) redirect("/panel/acceso");
  if (!["nurme","adminleon"].includes(user.professionalKey)) redirect("/panel");
  const {result}=await searchParams;
  return <main className="shell mb-section"><Link className="mb-text-link" href="/panel">← Volver al panel</Link><p className="mb-eyebrow">Cada nueva reserva, a mano</p><h1>Avisos de nuevas citas</h1><p>Cuando una clienta confirma su reserva en la web, guardamos un aviso aquí y enviamos los canales que tengas activados. Las citas creadas por el equipo siguen disponibles en WhatsApp.</p><Alerts outcome={result}/></main>;
}
