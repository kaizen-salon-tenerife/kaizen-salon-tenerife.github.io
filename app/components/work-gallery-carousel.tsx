"use client";

/* eslint-disable @next/next/no-img-element -- original images supplied by the owner */
import { useState, useRef } from "react";

const photos = [
  "Manicura verde esmeralda con acabado brillante",
  "Manicura borgoña con acabado brillante",
  "Manicura roja con copos de nieve y detalles blancos",
  "Manicura rosa y roja con lazos y detalles navideños",
];

export default function WorkGalleryCarousel() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const move = (step: number) => setActive((current) => (current + step + photos.length) % photos.length);

  return (
    <section className="mb-reviews" id="trabajos" aria-labelledby="trabajos-title">
      <div className="mb-reviews-heading">
        <div><p className="mb-eyebrow">Resultados y trabajos reales</p><h2 id="trabajos-title">Cada detalle tiene su historia.</h2></div>
        <p>Una selección de manicuras, colores y detalles de MB Beauty.</p>
      </div>
      <div className="mb-review-carousel mb-work-carousel" role="region" aria-roledescription="carrusel" aria-label="Fotografías de manicuras"
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
          <figure className="mb-review-slide mb-work-slide" key={active} role="group" aria-roledescription="diapositiva" aria-label={`${active + 1} de ${photos.length}`}>
            <div className="mb-work-image"><img src={`/brand/gallery/manicure-${active + 1}.png`} alt={photos[active]} width="1254" height="1254" loading="lazy" /></div>
            <figcaption>{photos[active]}</figcaption>

          </figure>
        </div>
        <div className="mb-review-controls">
          <button type="button" onClick={() => move(-1)} aria-label="Foto anterior">←</button>
          <div className="mb-review-dots" aria-label="Elegir fotografía">{photos.map((_, index) => <button type="button" key={index} onClick={() => setActive(index)} aria-label={`Ver foto ${index + 1}`} aria-current={index === active ? "true" : undefined}><span /></button>)}</div>
          <button type="button" onClick={() => move(1)} aria-label="Foto siguiente">→</button>
        </div>
      </div>
    </section>
  );
}
