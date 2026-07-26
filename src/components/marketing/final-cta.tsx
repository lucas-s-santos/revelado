"use client";

import Link from "next/link";

import { Magnetic } from "@/components/motion/magnetic";
import { useCountdown } from "@/hooks/use-countdown";
import { track } from "@/lib/analytics";
import { copy } from "@/lib/copy";

/**
 * CTA final com glow e contagem regressiva — SPEC 8.1 seção 11.
 * A mesma data real da barra de promoção, não um segundo prazo inventado.
 */
export function FinalCta({
  deadline,
  label,
  dateLabel,
  now,
}: {
  deadline: string;
  label: string;
  dateLabel: string;
  now: number;
}) {
  const { days, hours, minutes, seconds, done } = useCountdown(deadline, now);

  return (
    <section className="final-cta">
      <div className="final-cta__glow" aria-hidden />

      <p className="eyebrow">{copy.finalCta.eyebrow}</p>
      <h2 className="final-cta__title">{copy.finalCta.title}</h2>
      <p className="final-cta__lede">{copy.finalCta.lede}</p>

      {done ? null : (
        <p data-numeric className="final-cta__countdown">
          {label} em {days}d {String(hours).padStart(2, "0")}h{" "}
          {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}
          s
          <span className="block text-xs text-[rgb(var(--color-muted))]">
            {dateLabel} — dá tempo de imprimir
          </span>
        </p>
      )}

      <Magnetic>
        <Link
          href="/criar"
          onClick={() => void track("occasion_selected", { from: "final_cta" })}
          className="btn-primary btn-primary--lg"
        >
          {copy.finalCta.cta}
        </Link>
      </Magnetic>
    </section>
  );
}
