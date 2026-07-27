"use client";

import { useId, type ReactNode } from "react";

/**
 * Campo de formulário — SPEC 11: `label` real, erro associado por
 * `aria-describedby`, contador de caracteres quando há limite.
 *
 * Validação inline que nunca bloqueia o avanço "por bobagem" (SPEC 8.4): o
 * limite avisa, e o campo simplesmente não aceita mais texto.
 */
export function Field({
  label,
  hint,
  error,
  value,
  maxLength,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  value?: string;
  maxLength?: number;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const near =
    maxLength !== undefined && (value?.length ?? 0) > maxLength * 0.8;

  return (
    <div className="field">
      <div className="field__head">
        <label htmlFor={id} className="field__label">
          {label}
        </label>

        {maxLength !== undefined && near ? (
          <span data-numeric className="field__count">
            {value?.length ?? 0}/{maxLength}
          </span>
        ) : null}
      </div>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
