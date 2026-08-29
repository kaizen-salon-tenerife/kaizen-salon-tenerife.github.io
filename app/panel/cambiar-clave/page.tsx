"use client";

import Image from "next/image";
import { useState } from "react";
import PasswordField from "../password-field";

export default function ChangePasswordPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: form.get("password"),
          confirmation: form.get("confirmation"),
        }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(result?.error ?? "No se ha podido cambiar la contraseña. Inténtalo de nuevo.");
        return;
      }

      window.location.href = "/panel";
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "El cambio está tardando demasiado. Inténtalo de nuevo."
          : "No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="staff-auth-page single">
      <section className="staff-auth-card change-password-card">
        <div className="staff-auth-brand">
          <Image src="/logo-kaizen.png" alt="Kaizen" width={72} height={72} unoptimized />
          <span><strong>Kaizen</strong><small>Primer acceso</small></span>
        </div>
        <div className="staff-auth-heading">
          <p>Protege tu cuenta</p>
          <h1>Crea tu contraseña personal.</h1>
          <span>Debe tener 12 caracteres, mayúscula, minúscula, número y símbolo.</span>
        </div>
        <form onSubmit={submit} className="staff-auth-form">
          <PasswordField label="Nueva contraseña" name="password" autoComplete="new-password" minLength={12} required />
          <PasswordField label="Repetir contraseña" name="confirmation" autoComplete="new-password" minLength={12} required />
          {error && <p className="staff-auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar y continuar"}</button>
        </form>
      </section>
    </main>
  );
}
