"use client";

import { useRef } from "react";

import { Frame } from "@/components/ui/frame";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSectionProgress } from "@/hooks/use-section-progress";
import { copy } from "@/lib/copy";

/**
 * A assinatura da marca — SPEC 8.1 seção 7 e 6.3.
 *
 * Quatro fotos saem de `saturate(.06) blur(5px)` para nítidas conforme o
 * scroll, com stagger. O hook escreve `--p` no contêiner e a classe
 * `.developing` resolve o filtro em CSS: zero JS por frame.
 *
 * As fotos aqui são as molduras vazias do `Frame` — quando houver imagens de
 * exemplo em `public/`, é só passar `src`.
 */
export function Revelation() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useSectionProgress(ref, { enabled: !reduced });

  const labels = ["o primeiro encontro", "a viagem", "o dia a dia", "hoje"];

  return (
    <section className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.revelation.eyebrow}</p>
        <h2 className="section__title">{copy.revelation.title}</h2>
        <p className="section__lede">{copy.revelation.lede}</p>
      </header>

      <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {labels.map((label, index) => (
          <div
            key={label}
            className={reduced ? undefined : "developing"}
            style={{ "--i": index } as React.CSSProperties}
          >
            <Frame ratio="3/4" vignette={0.6}>
              <span className="eyebrow">{label}</span>
            </Frame>
          </div>
        ))}
      </div>
    </section>
  );
}
