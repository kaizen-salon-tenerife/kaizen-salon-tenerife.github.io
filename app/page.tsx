import Image from "next/image";
import Link from "next/link";
import PageMotion from "./components/page-motion";

const services = [
  {
    number: "01",
    title: "Manicuras",
    description:
      "Semipermanente, tradicional, Softgel y acrílico con acabados personalizados.",
    tags: ["Softgel", "Acrílico", "Decoración"],
    image: "/services/manicura.webp",
    alt: "Manicura azul marino con detalle dorado realizada en primer plano",
  },
  {
    number: "02",
    title: "Pedicura",
    description:
      "Cuidado completo con esmaltado tradicional o semipermanente.",
    tags: ["Tradicional", "Semipermanente"],
    image: "/services/pedicura.webp",
    alt: "Pedicura profesional azul marino con detalle dorado",
  },
  {
    number: "03",
    title: "Faciales",
    description:
      "Higiene facial, Dermapen y radiofrecuencia adaptados a tu piel.",
    tags: ["Higiene", "Dermapen", "Radiofrecuencia"],
    image: "/services/faciales.webp",
    alt: "Tratamiento facial profesional en primer plano",
  },
  {
    number: "04",
    title: "Mirada",
    description:
      "Diseño de cejas, extensiones, lifting, laminación y henna.",
    tags: ["Cejas", "Pestañas", "Lifting"],
    image: "/services/mirada.webp",
    alt: "Cejas y pestañas definidas con acabado profesional",
  },
  {
    number: "05",
    title: "Micropigmentación",
    description:
      "Micropigmentación de cejas y labios, y micropuntura de estrías.",
    tags: ["Cejas", "Labios", "Estrías"],
    image: "/services/micropigmentacion.webp",
    alt: "Diseño de cejas para micropigmentación pelo a pelo",
  },
  {
    number: "06",
    title: "Tatuajes",
    description:
      "Diseños personalizados y tatuajes pequeños de línea fina.",
    tags: ["Fine line", "Personalizados"],
    image: "/services/tatuajes.webp",
    alt: "Tatuaje botánico de línea fina en primer plano",
  },
];

const team = [
  {
    initials: "S",
    name: "Sarai",
    role: "Dirección · Estética y fine line",
    services: "Micropigmentación, micropuntura, faciales, cejas y tatuajes pequeños.",
  },
  {
    initials: "Y",
    name: "Yeroha",
    role: "Tatuador",
    services: "Tatuajes y diseños personalizados.",
  },
  {
    initials: "N",
    name: "Nurme",
    role: "Especialista en belleza",
    services: "Manicura, pedicura, faciales y miradas.",
  },
];

export default function Home() {
  return (
    <main>
      <PageMotion />
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="Kaizen, inicio">
            <Image
              src="/logo-kaizen.png"
              alt="Logotipo de Kaizen"
              width={58}
              height={58}
              priority
              unoptimized
            />
            <span>
              <strong>Kaizen</strong>
              <small>Estética y uñas</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <a href="#servicios">Servicios</a>
            <a href="#equipo">Equipo</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <Link className="button button-small" href="/reservar">
            Reservar cita
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Centro de belleza y tatuajes · Tenerife</p>
            <h1>
              Tu momento de <em>cuidarte.</em>
            </h1>
            <p className="hero-lead">
              Belleza, detalle y bienestar en un espacio pensado para ti.
              Reserva de forma sencilla y deja que el equipo de Kaizen se
              encargue del resto.
            </p>
            <div className="hero-actions">
              <Link className="button button-gold" href="/reservar">
                Reservar mi cita
                <span aria-hidden="true">→</span>
              </Link>
              <a
                className="button button-ghost"
                href="https://wa.me/34639384727?text=Hola%20Kaizen%2C%20quisiera%20informaci%C3%B3n%20sobre%20una%20cita."
                target="_blank"
                rel="noreferrer"
              >
                Hablar por WhatsApp
              </a>
            </div>
            <div className="hero-facts" aria-label="Información rápida">
              <div>
                <strong>L–V</strong>
                <span>09:30–18:00</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Especialistas</span>
              </div>
              <div>
                <strong>Online</strong>
                <span>Reserva confirmada</span>
              </div>
            </div>
          </div>

          <div
            className="hero-visual"
            aria-label="Identidad de Kaizen"
            data-parallax="hero"
          >
            <div className="logo-halo" />
            <Image
              className="hero-logo"
              src="/logo-kaizen.png"
              alt="Kaizen Estética y uñas"
              width={610}
              height={610}
              priority
              unoptimized
            />
            <div className="floating-note floating-note-top">
              <span className="note-icon">✓</span>
              <span>
                <small>Reserva sencilla</small>
                <strong>Cita confirmada al reservar</strong>
              </span>
            </div>
            <div className="floating-note floating-note-bottom">
              <span className="note-icon">◇</span>
              <span>
                <small>¿No hay hueco?</small>
                <strong>Únete a la lista de espera</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" data-reveal="up">
        <div className="shell trust-grid">
          <div><span>01</span> Atención personalizada</div>
          <div><span>02</span> Especialistas por servicio</div>
          <div><span>03</span> Recordatorios de cita</div>
          <div><span>04</span> Avisos de huecos por WhatsApp</div>
        </div>
      </section>

      <section className="section shell" id="servicios">
        <div className="section-heading" data-reveal="up">
          <div>
            <p className="eyebrow eyebrow-dark">Nuestros servicios</p>
            <h2>Todo el cuidado que buscas, en un solo lugar.</h2>
          </div>
          <p>
            Selecciona una categoría para comenzar. Podrás combinar varios
            servicios en la misma solicitud.
          </p>
        </div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article
              className="service-card"
              key={service.number}
              data-reveal="zoom"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="service-image" data-parallax="image">
                <Image
                  src={service.image}
                  alt={service.alt}
                  width={1200}
                  height={800}
                  unoptimized
                />
                <div className="service-number">{service.number}</div>
              </div>
              <div className="service-content">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <div className="service-tags">
                  {service.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <Link href="/reservar" aria-label={"Reservar " + service.title}>
                  Ver opciones <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="waitlist-section">
        <div className="shell waitlist-grid" data-reveal="up">
          <div className="waitlist-copy">
            <p className="eyebrow">Tu tiempo también importa</p>
            <h2>Si hoy no hay hueco, te avisamos cuando aparezca.</h2>
            <p>
              Indícanos el servicio y tus horarios preferidos. Cuando se libere
              una cita compatible, recibirás una propuesta por WhatsApp y
              tendrás una hora para aceptarla.
            </p>
            <Link className="button button-gold" href="/reservar?espera=1">
              Apuntarme a la lista
            </Link>
          </div>
          <div className="waitlist-card">
            <div className="phone-bar">
              <span>Kaizen</span>
              <small>WhatsApp Business</small>
            </div>
            <div className="message received">
              Se ha liberado una cita para <strong>manicura</strong> el jueves a
              las <strong>10:30</strong>. ¿Quieres reservarla?
            </div>
            <div className="message-time">Tienes 1 hora para responder</div>
            <div className="message-actions">
              <button type="button">Aceptar cita</button>
              <button type="button">Ahora no</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section shell" id="equipo">
        <div className="section-heading compact-heading" data-reveal="up">
          <div>
            <p className="eyebrow eyebrow-dark">El equipo</p>
            <h2>Profesionales que cuidan cada detalle.</h2>
          </div>
        </div>
        <div className="team-grid">
          {team.map((member, index) => (
            <article
              className="team-card"
              key={member.name}
              data-reveal="up"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="team-avatar">{member.initials}</div>
              <div>
                <h3>{member.name}</h3>
                <span>{member.role}</span>
                <p>{member.services}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contacto">
        <div className="shell contact-grid" data-reveal="up">
          <div>
            <p className="eyebrow">Ven a conocernos</p>
            <h2>Kaizen, tu centro de belleza en Barranco Grande.</h2>
          </div>
          <div className="contact-details">
            <div>
              <small>Dirección</small>
              <strong>Ctra. General de Taco, 14 · Local 14</strong>
              <span>Barranco Grande · Tenerife</span>
            </div>
            <div>
              <small>Horario</small>
              <strong>Lunes a viernes</strong>
              <span>09:30–18:00</span>
            </div>
            <div>
              <small>Contacto</small>
              <strong>639 38 47 27</strong>
              <span>WhatsApp y teléfono</span>
            </div>
          </div>
          <div className="contact-actions">
            <Link className="button button-gold" href="/reservar">
              Reservar cita
            </Link>
            <a
              className="button button-on-dark"
              href="https://www.instagram.com/kaizensalon.tnf/"
              target="_blank"
              rel="noreferrer"
            >
              Ver Instagram
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="shell footer-grid">
          <div className="brand footer-brand">
            <Image src="/logo-kaizen.png" alt="" width={44} height={44} unoptimized />
            <span><strong>Kaizen</strong><small>Estética y uñas</small></span>
          </div>
          <div className="footer-legal">
            <p>© 2026 Kaizen. Cuidamos de ti, cita a cita.</p>
            <Link className="privacy-footer-link" href="/privacidad">
              Privacidad
            </Link>
          </div>
          <Link
            className="employee-access-button"
            href="/panel"
            aria-label="Abrir el área privada de empleadas"
          >
            <span className="employee-access-icon" aria-hidden="true">K</span>
            <span className="employee-access-copy">
              <small>Área privada de empleadas</small>
              <strong>Iniciar sesión</strong>
            </span>
            <span className="employee-access-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
