"use client";

import { useState, type InputHTMLAttributes } from "react";

export default function PasswordField({
  label,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      <span>{label}</span>
      <div className="password-input-wrap">
        <input {...inputProps} type={visible ? "text" : "password"} />
        <button
          className="password-visibility-button"
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.4 12s3.5-6 9.6-6 9.6 6 9.6 6-3.5 6-9.6 6-9.6-6-9.6-6Z" />
            <circle cx="12" cy="12" r="2.8" />
            {!visible && <path className="eye-slash" d="m4 4 16 16" />}
          </svg>
        </button>
      </div>
    </label>
  );
}
