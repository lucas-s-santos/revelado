"use client";

import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { Marquee } from "@/components/ui/marquee";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { copy } from "@/lib/copy";
import { OCCASIONS } from "@/lib/occasions";

/**
 * Faixa de ocasiões rolando — SPEC 8.1 seção 4 e 6.3 (pausar no hover).
 * Em `prefers-reduced-motion` vira uma lista estática, não some: o conteúdo é
 * informação, só o movimento é decoração (SPEC 11).
 */
export function OccasionsMarquee() {
  const reduced = useReducedMotion();

  const chips = OCCASIONS.map((occasion) => (
    <span
      key={occasion.id}
      data-occasion={occasion.id}
      className="occasion-chip"
    >
      <span style={{ color: "rgb(var(--color-accent))" }}>
        <OccasionIcon name={occasion.icon} size={16} />
      </span>
      {occasion.name}
    </span>
  ));

  return (
    <section className="py-6" aria-label={copy.marquee.eyebrow}>
      {reduced ? (
        <ul className="container-page flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>{chip}</li>
          ))}
        </ul>
      ) : (
        <Marquee pauseOnHover className="[--duration:34s] [--gap:0.75rem]">
          {chips}
        </Marquee>
      )}
    </section>
  );
}
