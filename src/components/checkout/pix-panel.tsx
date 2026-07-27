"use client";

import { useCallback, useEffect, useState } from "react";

import { useCountdown } from "@/hooks/use-countdown";
import { track } from "@/lib/analytics";
import { formatBRL } from "@/lib/utils";

/**
 * Tela do Pix — SPEC 8.5.
 *
 * "Mostrar QR e código copiável na própria tela — polling a cada 3s **e**
 * webhook." O polling só serve para a tela reagir rápido; quem publica é o
 * webhook (anti-padrão 6).
 *
 * Quando o pagamento confirma, o `Multi Step Loader` da SPEC vira estes passos
 * simples com estado real, para não anunciar "publicando" antes de estar.
 */

const POLL_MS = 3000;

type Phase = "waiting" | "confirming" | "done" | "expired";

export function PixPanel({
  orderId,
  code,
  expiresAt,
  simulated,
  amountCents,
  onConfirmed,
}: {
  orderId: string;
  code: string;
  expiresAt: string;
  simulated: boolean;
  amountCents: number;
  onConfirmed: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(expiresAt);

  const check = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const body = (await response.json()) as {
        status: string;
        published: boolean;
      };

      if (body.status === "PAID") {
        setPhase(body.published ? "done" : "confirming");
        if (body.published) {
          void track("payment_confirmed", { order: orderId });
          onConfirmed();
        }
      }

      if (body.status === "EXPIRED" || body.status === "FAILED") {
        setPhase("expired");
      }
    } catch {
      // Rede instável não é motivo para assustar: o próximo ciclo tenta de novo.
    }
  }, [orderId, onConfirmed]);

  useEffect(() => {
    if (phase === "done" || phase === "expired") return;

    const id = setInterval(() => void check(), POLL_MS);
    void check();
    return () => clearInterval(id);
  }, [check, phase]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="pix">
      <div className="pix__card glass">
        <p className="eyebrow">pagamento por pix</p>
        <h1 className="pix__title">
          {phase === "confirming"
            ? "Pagamento recebido — publicando…"
            : phase === "expired"
              ? "Este Pix expirou"
              : "Escaneie para pagar"}
        </h1>

        <p data-numeric className="pix__amount">
          {formatBRL(amountCents)}
        </p>

        {phase === "waiting" ? (
          <>
            <div className="pix__code">
              <code>{code}</code>
            </div>

            <button
              type="button"
              onClick={() => void copy()}
              className="btn-primary"
            >
              {copied ? "Código copiado" : "Copiar código Pix"}
            </button>

            <p className="pix__hint">
              Abra o app do seu banco, escolha Pix copia-e-cola e confirme. Esta
              tela avisa sozinha quando o pagamento cair.
            </p>

            {countdown.done ? null : (
              <p data-numeric className="pix__timer">
                expira em {String(countdown.minutes).padStart(2, "0")}:
                {String(countdown.seconds).padStart(2, "0")}
              </p>
            )}
          </>
        ) : null}

        {phase === "confirming" ? (
          <ol className="pix__steps">
            <li data-done>Pagamento confirmado</li>
            <li data-current>Publicando sua página</li>
            <li>Gerando o QR Code</li>
          </ol>
        ) : null}

        {phase === "expired" ? (
          <p className="pix__hint">
            Nada foi cobrado e sua página continua salva. Volte ao checkout para
            gerar um novo código.
          </p>
        ) : null}

        {simulated ? (
          <SimulatorPanel orderId={orderId} onSimulated={() => void check()} />
        ) : null}
      </div>
    </main>
  );
}

/**
 * Painel do simulador — só aparece sem `MERCADOPAGO_ACCESS_TOKEN`.
 *
 * Dispara o webhook de verdade, com o mesmo corpo que o Mercado Pago mandaria.
 * É assim que o e2e cobre pago, pendente, expirado e reembolsado sem conta no
 * provedor — e é a prova de que a publicação passa pelo webhook, nunca por
 * dentro da aplicação.
 */
function SimulatorPanel({
  orderId,
  onSimulated,
}: {
  orderId: string;
  onSimulated: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function fire(action: string) {
    setBusy(true);
    try {
      await fetch("/api/webhooks/mercadopago", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          action: `payment.${action}`,
          data: { id: `sim_${orderId}` },
        }),
      });
      onSimulated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pix__sim">
      <p className="eyebrow">simulador (sem credencial do mercado pago)</p>
      <div className="flex flex-wrap gap-2">
        {[
          { action: "approved", label: "Pagar" },
          { action: "pending", label: "Deixar pendente" },
          { action: "cancelled", label: "Expirar" },
          { action: "refunded", label: "Reembolsar" },
        ].map((option) => (
          <button
            key={option.action}
            type="button"
            disabled={busy}
            onClick={() => void fire(option.action)}
            className="chip"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
