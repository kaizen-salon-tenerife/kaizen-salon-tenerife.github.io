/* eslint-disable @next/next/no-img-element -- pre-sized responsive WebP assets served directly by Cloudflare */
import Link from "next/link";
import MobileNavigation from "./components/mobile-navigation";

const services = [
  { number: "01", title: "Manicura y uñas", description: "Manicura tradicional, semipermanente, Softgel y acrílico. Un cuidado pensado para tu estilo.", image: "manicure", alt: "Imagen corporativa de manicura", tags: "MANICURA · SOFTGEL · ACRÍLICO" },
  { number: "02", title: "Cuidado facial", description: "Higiene facial profunda, limpieza con tratamiento y radiofrecuencia. Descubre las opciones de cuidado facial.", image: "facial", alt: "Imagen corporativa de cuidado facial", tags: "HIGIENE · LIMPIEZA · CUIDADO" },
  { number: "03", title: "Pedicura", description: "Cuidado de tus pies con pedicura tradicional o semipermanente.", tags: "TRADICIONAL · SEMIPERMANENTE" },
  { number: "04", title: "Lash & Brows", description: "Cejas y pestañas: depilación, extensiones, lifting con tinte, laminación y henna.", tags: "CEJAS · PESTAÑAS · LIFTING" },
];

export default function Home() {
  return (
    <main className="mb-home" id="inicio">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="mb-header"><div className="shell mb-header-inner">
        <Link className="mb-brand" href="/" aria-label="MB Beauty, inicio">

          <img src="/brand/logo/mb-beauty-mark.webp" alt="" width="60" height="60" />
          <span><strong>MB Beauty</strong><small>Estética · Tenerife</small></span>
        </Link>
        <nav className="mb-desktop-nav" aria-label="Navegación principal"><a href="#servicios">Servicios</a><a href="#nurme">Sobre Nurme</a><a href="#contacto">Contacto</a></nav>
        <Link className="mb-button mb-header-book" href="/reservar" aria-label="Reservar cita"><span className="mb-book-full">Reservar cita</span><span className="mb-book-mobile" aria-hidden="true">Reservar</span><span className="mb-book-arrow" aria-hidden="true">↗</span></Link><MobileNavigation />
      </div></header>
      <section className="shell mb-hero" id="contenido">
        <div className="mb-hero-copy"><p className="mb-eyebrow">Tu espacio de belleza en La Cuesta</p><h1>Belleza, cuidado<br />y <em>dedicación.</em></h1><p className="mb-lead">Tratamientos de estética y uñas con atención personalizada en La Cuesta, Tenerife.</p><div className="mb-actions"><Link className="mb-button" href="/reservar">Reservar cita <span aria-hidden="true">↗</span></Link><a className="mb-text-link" href="#servicios">Descubrir servicios <span aria-hidden="true">↓</span></a></div><div className="mb-hero-signature"><span aria-hidden="true">N</span><p><strong>El cuidado empieza contigo.</strong><small>Nurme Martín · Profesional y propietaria</small></p></div></div>
        <figure className="mb-hero-art"><img src="/brand/web/mb-beauty-hero-960.webp" srcSet="/brand/web/mb-beauty-hero-480.webp 480w, /brand/web/mb-beauty-hero-960.webp 960w" sizes="(max-width: 760px) 90vw, 45vw" alt="Emblema circular MB Beauty Estética sobre fondo marfil" width="960" height="960" fetchPriority="high" /><figcaption>ATENCIÓN PERSONALIZADA, CITA A CITA</figcaption></figure>
      </section>
      <div className="mb-values"><div className="shell"><span>Atención personalizada</span><span>Cuidado y detalle</span><span>Tu momento para ti</span></div></div>
      <section className="shell mb-section" id="servicios">
        <div className="mb-section-heading"><div><p className="mb-eyebrow">La belleza está en los detalles</p><h2>Cuidado a tu medida.</h2></div><p>Elige tu momento. Consulta los servicios, precios y tiempos disponibles antes de reservar.</p></div>
        <div className="mb-service-grid">{services.map((service) => (
          <article className={`mb-service-card ${service.image ? "" : "mb-service-simple"}`} key={service.number}>
            {service.image && <figure><img src={`/brand/services/mb-beauty-${service.image}-960.webp`} srcSet={`/brand/services/mb-beauty-${service.image}-480.webp 480w, /brand/services/mb-beauty-${service.image}-960.webp 960w`} sizes="(max-width: 760px) 90vw, 45vw" alt={service.alt} width="960" height="960" loading="lazy" /><figcaption>Imagen corporativa · No representa un trabajo real</figcaption></figure>}
            <div className="mb-service-copy"><span className="mb-service-number">{service.number}</span><p className="mb-eyebrow">{service.tags}</p><h3>{service.title}</h3><p>{service.description}</p><Link className="mb-text-link" href="/reservar">Ver servicios <span aria-hidden="true">↗</span></Link></div>
          </article>
        ))}</div>
      </section>
      <section className="mb-about" id="nurme"><div className="shell mb-about-grid"><div className="mb-monogram" aria-hidden="true">N<span>Nurme Martín</span></div><div><p className="mb-eyebrow">La persona detrás de MB Beauty</p><h2>Hola, soy Nurme.</h2><p>MB Beauty es mi espacio de estética y cuidado personal. Como propietaria y profesional principal, te acompaño en la elección de tus servicios de uñas, faciales, cejas y pestañas.</p><p>Un trato cercano, atención personalizada y dedicación en cada cita.</p><a className="mb-text-link" href="https://www.instagram.com/mbstetic17/" target="_blank" rel="noreferrer">Conoce MB Beauty en Instagram <span aria-hidden="true">↗</span></a></div></div></section>
      <section className="shell mb-section mb-community"><div><p className="mb-eyebrow">Resultados y trabajos reales</p><h2>Cada detalle tiene su historia.</h2><div className="mb-gallery" aria-label="Galería de trabajos reales"><p>Próximamente compartiremos aquí fotografías auténticas de los trabajos de Nurme, publicadas con autorización.</p></div></div><div><p className="mb-eyebrow">Vuestras experiencias</p><h2>Un espacio para tu opinión.</h2><div className="mb-empty-testimonials"><p>Este espacio recogerá experiencias reales de quienes visitan MB Beauty.</p><a className="mb-text-link" href="https://www.instagram.com/mbstetic17/" target="_blank" rel="noreferrer">Síguenos en Instagram ↗</a></div></div></section>
      <section className="mb-contact" id="contacto"><div className="shell mb-contact-grid"><div><p className="mb-eyebrow">Nos vemos en tu próxima cita</p><h2>Dedícate un momento.</h2><p>MB Beauty · La Cuesta, Tenerife</p><div className="mb-actions"><Link className="mb-button mb-button-light" href="/reservar">Reservar cita ↗</Link><a className="mb-contact-link" href="https://wa.me/34639384727?text=Hola%20MB%20Beauty%2C%20quisiera%20informaci%C3%B3n%20sobre%20una%20cita." target="_blank" rel="noreferrer">Hablar por WhatsApp ↗</a></div></div><div className="mb-contact-details"><div><small>Contacto</small><a href="tel:+34639384727">639 38 47 27</a></div><div><small>Dirección registrada · Confirma antes de acudir</small><p>Ctra. General de Taco, 14 · Local 14<br />Barranco Grande · Tenerife</p></div><div><small>Horario actual de reservas</small><p>Lunes a viernes · 09:30–18:00<br />Sábados · 09:30–13:30</p></div></div></div></section>
      <footer className="mb-footer"><div className="shell mb-footer-grid"><div><strong>MB Beauty</strong><p>Estética y cuidado personalizado.<br />La Cuesta, Tenerife.</p></div><nav aria-label="Enlaces del pie"><a href="https://www.instagram.com/mbstetic17/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="#contacto">Contacto</a><Link href="/privacidad">Privacidad</Link><Link href="/panel">Acceso privado al panel ↗</Link></nav></div><div className="shell mb-footer-bottom">© {new Date().getFullYear()} MB Beauty · Cuidamos de ti, cita a cita.</div></footer>
    </main>
  );
}
