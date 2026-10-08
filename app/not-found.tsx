import Link from "next/link";
export default function NotFound() {
  return <main className="legal-page"><div className="legal-shell"><p className="eyebrow eyebrow-dark">MB Beauty · 404</p><h1>Esta página no está disponible.</h1><p className="legal-intro">Puedes volver al inicio o reservar tu próxima cita.</p><Link className="mb-button" href="/">Volver al inicio</Link> <Link className="mb-text-link" href="/reservar">Reservar cita ↗</Link></div></main>;
}
