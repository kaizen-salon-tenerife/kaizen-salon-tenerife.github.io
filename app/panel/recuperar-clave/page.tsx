import Link from "next/link";
export const metadata = { title: "Ayuda de acceso | MB Beauty", robots: { index: false, follow: false } };
export default function AccessHelp() {
  return <main className="legal-page"><div className="legal-shell"><p className="eyebrow eyebrow-dark">MB Beauty · Acceso privado</p><h1>¿Has olvidado tu contraseña?</h1><p className="legal-intro">Contacta con Manuel, administrador técnico principal, para solicitar ayuda con tu acceso. La recuperación automática por correo todavía no está disponible.</p><p>No compartas tu contraseña. Si es tu primer acceso, el panel te pedirá crear una contraseña personal después de iniciar sesión.</p><Link className="mb-button" href="/panel/acceso">Volver al acceso</Link></div></main>;
}
