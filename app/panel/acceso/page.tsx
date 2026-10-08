"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PasswordField from "../password-field";

export default function StaffLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (refreshAttempted.current) return;
    refreshAttempted.current = true;
    const controller = new AbortController();
    fetch("/api/auth/refresh", { method: "POST", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json() as { mustChangePassword?: boolean };
        window.location.href = result.mustChangePassword
          ? "/panel/cambiar-clave"
          : "/panel";
      })
      .catch(() => null);
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        mustChangePassword?: boolean;
      } | null;

      if (!response.ok) {
        setError(result?.error ?? "No se ha podido iniciar sesión. Inténtalo de nuevo.");
        return;
      }

      window.location.href = result?.mustChangePassword
        ? "/panel/cambiar-clave"
        : "/panel";
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "La comprobación está tardando demasiado. Inténtalo de nuevo."
          : "No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="staff-auth-page">
      <section className="staff-auth-card">
        <Link href="/" className="staff-auth-brand" aria-label="Volver a MB Beauty">
          <Image src="/brand/logo/mb-beauty-mark.webp" alt="MB Beauty" width={82} height={82} unoptimized />
          <span><strong>MB Beauty</strong><small>Panel del equipo</small></span>
        </Link>
        <div className="staff-auth-heading">
          <p>Acceso privado</p>
          <h1>Bienvenida de nuevo.</h1>
          <span>Introduce tus datos internos para gestionar tu agenda y tus clientas.</span>
        </div>
        <form onSubmit={submit} className="staff-auth-form">
          <label><span>Correo interno</span><input name="email" type="email" autoComplete="username" required placeholder="Tu correo interno" /></label>
          <PasswordField label="Contraseña" name="password" autoComplete="current-password" required placeholder="Tu contraseña" />
          {error && <p className="staff-auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? "Comprobando…" : "Entrar al panel"}</button>
        </form>
        <Link className="staff-recovery-link" href="/panel/recuperar-clave">¿Has olvidado tu contraseña?</Link>
        <p className="staff-auth-help">Acceso exclusivo para el equipo de MB Beauty.</p>
      </section>
      <aside className="staff-auth-visual" aria-hidden="true">
        <div><small>MB Beauty · Tenerife</small><strong>Tu agenda,<br />siempre clara.</strong><span>Clientes, citas y organización en un único espacio seguro.</span></div>
      </aside>
    </main>
  );
}
