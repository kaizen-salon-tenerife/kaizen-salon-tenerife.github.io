import Link from "next/link";
import ManageBooking from "./manage-booking";
import "./management.css";

export const metadata={title:"Gestionar mi cita | MB Nurme Beauty",robots:{index:false,follow:false},referrer:"no-referrer"};
export default function MyBooking(){return <main className="customer-booking-page"><div className="customer-booking-shell"><Link className="mb-text-link" href="/">← Volver al inicio</Link><p className="mb-eyebrow">Tu reserva, a mano</p><h1>Gestionar mi cita</h1><p>Consulta, cambia o cancela tu reserva online con tu código y el teléfono usado al reservar.</p><ManageBooking /></div></main>;}
