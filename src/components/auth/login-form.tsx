"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";

interface LoginFormProps {
  callbackUrl: string;
}

/**
 * `redirect: false` porque o resultado é assíncrono (o link chega por
 * e-mail) — não há para onde navegar agora. O estado "enviado" fica aqui
 * dentro, mesmo padrão do Pix em `checkout-form.tsx`: sucesso é um card que
 * substitui o formulário, não outra rota.
 */
export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Não deu para mandar o link. Confira o e-mail e tente de novo.");
        return;
      }

      setSent(true);
    } catch {
      setError("A conexão falhou. Confira sua internet e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="panel__empty">
        <p>Mandamos um link para {email}.</p>
        <p className="text-sm text-[rgb(var(--color-ink-muted))]">
          Abra o e-mail e clique — ele vale por um tempo curto e só funciona
          uma vez.
        </p>
      </div>
    );
  }

  return (
    <form className="fieldset max-w-sm" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email" className="field__label">
          Seu e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          autoComplete="email"
          className="input"
        />
      </div>

      {error ? (
        <p role="alert" className="field__error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary btn-primary--lg w-full justify-center"
      >
        {submitting ? "Mandando o link…" : "Mandar link de entrada"}
      </button>
    </form>
  );
}
