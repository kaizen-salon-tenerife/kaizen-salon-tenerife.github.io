import Link from "next/link";

export const metadata = {
  title: "Privacidad | MB Nurme Beauty",
  description: "Información sobre el uso de datos personales en MB Nurme Beauty.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-back" href="/">← Volver a MB Nurme Beauty</Link>
        <p className="eyebrow eyebrow-dark">Información clara y sencilla</p>
        <h1>Aviso de privacidad</h1>
        <p className="legal-intro">
          MB Nurme Beauty utiliza únicamente los datos necesarios para organizar las citas,
          prestar los tratamientos y mantener un historial profesional seguro.
        </p>

        <section>
          <h2>Responsable</h2>
          <p>
            Nurme Martín · MB Nurme Beauty.<br />
            Contacto: <a href="tel:+34652430072">+34 652 43 00 72</a> o
            <a href="https://wa.me/34652430072"> WhatsApp</a>.
          </p>
        </section>

        <section>
          <h2>Datos y finalidad</h2>
          <p>
            Podemos tratar tu nombre, teléfono, citas, servicios, observaciones
            necesarias, fichas de tratamiento y datos de cobro para gestionar tu
            reserva, atenderte y mantener la continuidad del servicio.
          </p>
        </section>

        <section>
          <h2>Fotografías</h2>
          <p>
            Las fotografías de antes y después son opcionales. Se guardan de forma
            privada únicamente si lo autorizas. No se publicarán en redes sociales
            ni se utilizarán con fines promocionales sin una autorización expresa
            y separada.
          </p>
        </section>

        <section>
          <h2>Base, acceso y conservación</h2>
          <p>
            Los datos de la cita se tratan para gestionar el servicio solicitado;
            las fotografías, mediante tu consentimiento. Solo accederá el personal
            autorizado de MB Nurme Beauty y los proveedores técnicos imprescindibles. No se
            venderán tus datos y se conservarán únicamente durante el tiempo
            necesario para estas finalidades y las obligaciones aplicables.
          </p>
        </section>

        <section>
          <h2>Agenda en Google Calendar</h2>
          <p>
            Cuando la profesional conecta su cuenta de Google, la web envía el
            nombre de la clienta, el servicio, la fecha, la duración y las notas
            de la cita a un calendario privado
            de MB Nurme Beauty. Esta conexión permite consultar la agenda en el móvil.
            No se envían teléfonos, fichas ni fotografías de las
            clientas. La profesional puede desconectar la sincronización desde
            el panel; las citas ya enviadas permanecen en su calendario de Google.
          </p>
        </section>

        <section>
          <h2>Avisos de nuevas reservas</h2>
          <p>
            Al confirmarse una reserva web, se guarda un aviso privado para Nurme y
            administración. Si activan estos canales, el aviso incluye el nombre,
            servicio, fecha y hora de la cita por correo y por notificación en sus
            dispositivos. Para ello se utilizan Gmail y los servicios de
            notificaciones del navegador o dispositivo. No se incluyen teléfonos,
            notas de tratamiento ni fotografías en estos avisos.
          </p>
          <p>
            La conexión opcional con Gmail solicita permiso de envío y de
            identificación de la cuenta de la profesional; no permite leer su
            bandeja de entrada. Los permisos de notificación pueden desactivarse
            desde el panel o los ajustes del dispositivo.
          </p>
        </section>

        <section>
          <h2>Tus derechos</h2>
          <p>
            Puedes solicitar acceso, corrección o eliminación de tus datos, limitar
            su uso, o retirar una autorización de fotografías contactando con
            MB Nurme Beauty. También puedes presentar una reclamación ante la Agencia
            Española de Protección de Datos.
          </p>
        </section>

        <p className="legal-version">Versión del aviso: 24 de octubre de 2026.</p>
      </div>
    </main>
  );
}
