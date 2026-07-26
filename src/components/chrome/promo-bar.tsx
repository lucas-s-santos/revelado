"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { useCountdown } from "@/hooks/use-countdown";
import { copy } from "@/lib/copy";

const COOKIE = "revelado_promo_dismissed";

/**
 * Barra de promoção sticky — SPEC 8.1 seção 1.
 *
 * Contagem regressiva **real**: o prazo é a próxima comemoração de verdade,
 * calculada no servidor e passada como prop (nada de contador que reinicia
 * sozinho). Dispensável, e a escolha fica num cookie de 30 dias.
 *
 * Pulso magenta: `opacity`/`transform` só, nunca cor de fundo (SPEC 6.1 regra 3).
 */
export function PromoBar({
  deadline,
  label,
  dateLabel,
  now,
}: {
  /** ISO da data-alvo */
  deadline: string;
  label: string;
  dateLabel: string;
  /** Date.now() do servidor: mata o piscar na hidratação */
  now: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { days, hours, minutes, seconds, done } = useCountdown(deadline, now);

  useEffect(() => {
    setMounted(true);
    setDismissed(document.cookie.includes(`${COOKIE}=1`));
  }, []);

  function dismiss() {
    setDismissed(true);
    document.cookie = `${COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }

  // Antes de montar, renderiza igual ao servidor; depois obedece ao cookie.
  if (done || (mounted && dismissed)) return null;

  return (
    <div className="promo-bar">
      <p className="promo-bar__text">
        <span aria-hidden className="promo-bar__pulse" />
        <strong className="font-medium">{label}</strong> é {dateLabel} —{" "}
        <span data-numeric className="whitespace-nowrap">
          {days}d {String(hours).padStart(2, "0")}h{" "}
          {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}
          s
        </span>{" "}
        <span className="hidden sm:inline">{copy.promo.suffix}</span>
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.promo.dismiss}
        className="promo-bar__close"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
