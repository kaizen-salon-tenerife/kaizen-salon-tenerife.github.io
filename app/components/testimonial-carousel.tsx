"use client";

/* eslint-disable @next/next/no-img-element -- local optimized comment images */
import { useState, useRef } from "react";

const comments = [
  "Que grandeeeeeee 🖤✨",
  "👏 👏 👏 👏 👏",
  "Que estilo",
  "INCREÍBLE 👏 👏 👏",
  "me encanto tu trabajo,en las mejores manos 💕",
];

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const move = (step: number) => setActive((current) => (current + step + comments.length) % comments.length);

  return (
    <section className="mb-reviews" id="opiniones" aria-labelledby="opiniones-title">
      <div className="mb-reviews-heading">
        <div><p className="mb-eyebrow">Vuestras experiencias</p><h2 id="opiniones-title">Palabras que nos hacen sonreír.</h2></div>
        <p>Un poquito del cariño que recibimos en Instagram. Gracias por acompañarnos.</p>
      </div>
      <div className="mb-review-carousel" role="region" aria-roledescription="carrusel" aria-label="Comentarios de Instagram"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        }}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStart.current !== null) {
            const distance = touchStart.current - event.changedTouches[0].clientX;
            if (Math.abs(distance) > 50) move(distance > 0 ? 1 : -1);
          }
          touchStart.current = null;
        }}>
        <div className="mb-review-stage" aria-live="polite" aria-atomic="true">
          <figure className="mb-review-slide" key={active} role="group" aria-roledescription="diapositiva" aria-label={`${active + 1} de ${comments.length}`}>
            <img src={`/brand/reviews/comment-${active + 1}.webp`} alt="Comentario de Instagram con la identidad de la cuenta oculta" width="2172" height="724" loading="lazy" />
            <figcaption><span className="mb-review-quote" aria-hidden="true">“</span><blockquote>{comments[active]}</blockquote><span className="mb-review-source">Compartido en Instagram · Cuenta privada</span></figcaption>
          </figure>
        </div>
        <div className="mb-review-controls">
          <button type="button" onClick={() => move(-1)} aria-label="Comentario anterior">←</button>
          <div className="mb-review-dots" aria-label="Elegir comentario">{comments.map((_, index) => <button type="button" key={index} onClick={() => setActive(index)} aria-label={`Ver comentario ${index + 1}`} aria-current={index === active ? "true" : undefined}><span /></button>)}</div>
          <button type="button" onClick={() => move(1)} aria-label="Comentario siguiente">→</button>
        </div>
      </div>
      <div className="mb-reviews-footer"><p>Nombres y fotos de perfil ocultos para cuidar vuestra privacidad.</p><a className="mb-text-link" href="https://www.instagram.com/mbstetic17/" target="_blank" rel="noreferrer">Más en nuestro Instagram ↗</a></div>
    </section>
  );
}
