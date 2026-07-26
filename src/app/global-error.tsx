"use client";

import { useEffect } from "react";

/**
 * Último recurso: erro de render que escapa de todos os error boundaries.
 * Precisa trazer <html> e <body> próprios — substitui o root layout inteiro,
 * então repete o essencial dos tokens inline.
 * Voz da interface (SPEC 11): explica o que houve e o que fazer, sem pedir
 * desculpa e sem ser vago.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Import dinâmico pelo mesmo motivo do instrumentation-client: o SDK não
    // pode entrar no First Load JS (SPEC 10).
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0a0711",
          color: "#f6efe6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "40ch" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 400 }}>
            Alguma coisa quebrou aqui do nosso lado
          </h1>
          <p style={{ color: "#9b90aa", lineHeight: 1.6 }}>
            Seu trabalho está salvo. Tente de novo — se continuar, recarregue a
            página.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: "#f2b457",
              color: "#0a0711",
              font: "inherit",
              fontWeight: 500,
            }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
