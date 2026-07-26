"use client";

import { useRef } from "react";

import { useElapsed } from "@/hooks/use-elapsed";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSectionProgress } from "@/hooks/use-section-progress";
import { copy } from "@/lib/copy";

/**
 * Mockup de celular do hero, com contador ao vivo e cartão de QR inclinado,
 * ambos em parallax — SPEC 8.1 seção 3.
 *
 * É marketing, não o `PhoneFrame` do editor (Fase 3): aqui o conteúdo é fixo e
 * não passa pelo BlockRenderer, então não há duplicação de renderer a temer.
 *
 * O parallax sai do `--p` escrito pelo use-section-progress; as profundidades
 * são `translateY` em CSS. Zero JS por frame.
 */
export function HeroPhone({
  since,
  now,
}: {
  /** ISO da data de início do contador de demonstração */
  since: string;
  now: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { years, months, days, hours, minutes, seconds } = useElapsed(
    since,
    now,
  );

  useSectionProgress(ref, { enabled: !reduced });

  return (
    <div ref={ref} className="hero-phone" aria-hidden={false}>
      <div className="hero-phone__device" data-depth="1">
        <div className="hero-phone__screen">
          <div className="hero-phone__photo" />

          <div className="hero-phone__body">
            <p className="eyebrow">{copy.phone.counterLabel}</p>

            <p data-numeric className="hero-phone__counter">
              <span>{years}</span>
              <small>{copy.units.yearsShort}</small> <span>{months}</span>
              <small>{copy.units.monthsShort}</small> <span>{days}</span>
              <small>{copy.units.daysShort}</small>
            </p>

            <p data-numeric className="hero-phone__clock">
              {String(hours).padStart(2, "0")}:
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>

            <p className="hero-phone__letter">{copy.phone.letter}</p>

            <div className="hero-phone__thumbs">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>

      <div className="hero-phone__qr" data-depth="2">
        <QrPlaceholder />
        <p className="eyebrow mt-2 text-center">{copy.phone.qrHint}</p>
      </div>
    </div>
  );
}

/**
 * Marca de QR decorativa. O QR real é gerado no servidor com nível de correção
 * H (SPEC 9.3) — este aqui só existe para o mockup ter forma de QR.
 */
function QrPlaceholder() {
  const cells = [
    "1110111",
    "1000101",
    "1011101",
    "0000000",
    "1101011",
    "1010001",
    "1110111",
  ];

  return (
    <div aria-hidden className="hero-phone__qr-grid">
      {cells.flatMap((row, y) =>
        row
          .split("")
          .map((cell, x) => (
            <span key={`${y}-${x}`} data-on={cell === "1" ? "" : undefined} />
          )),
      )}
    </div>
  );
}
