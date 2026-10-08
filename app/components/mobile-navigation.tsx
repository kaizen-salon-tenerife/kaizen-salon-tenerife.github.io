"use client";
import { useState } from "react";

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return <div className="mb-mobile-menu" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.querySelector("button")?.focus(); } }}>
    <button type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen(!open)}><span className="mb-menu-word">{open ? "Cerrar" : "Menú"}</span><span aria-hidden="true">{open ? " ×" : " ☰"}</span></button>
    <nav id="mobile-navigation" aria-label="Navegación móvil" hidden={!open} onClick={() => setOpen(false)}><a href="#servicios">Servicios</a><a href="#nurme">Sobre Nurme</a><a href="#contacto">Contacto</a><a href="/reservar">Reservar cita ↗</a></nav>
  </div>;
}
