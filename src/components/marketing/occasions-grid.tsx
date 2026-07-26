"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";

import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { track } from "@/lib/analytics";
import { copy } from "@/lib/copy";
import { OCCASIONS } from "@/lib/occasions";

/**
 * Grid de ocasiões — SPEC 8.1 seção 6 e 6.3: passar o ponteiro no card troca
 * `--color-accent` da **página inteira**.
 *
 * A troca é um `dataset` no `documentElement`, não estado do React: nada
 * re-renderiza, o CSS resolve. Ao sair do grid, volta para o accent padrão.
 */
export function OccasionsGrid() {
  const setAccent = useCallback((occasionId: string | null) => {
    const root = document.documentElement;
    if (occasionId) root.dataset.occasion = occasionId;
    else delete root.dataset.occasion;
  }, []);

  // Desmontar com o ponteiro dentro não pode deixar a página com accent preso.
  useEffect(() => () => setAccent(null), [setAccent]);

  return (
    <section id="ocasioes" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.occasions.eyebrow}</p>
        <h2 className="section__title">{copy.occasions.title}</h2>
        <p className="section__lede">{copy.occasions.lede}</p>
      </header>

      <ul
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onPointerLeave={() => setAccent(null)}
      >
        {OCCASIONS.map((occasion) => (
          <li
            key={occasion.id}
            onPointerEnter={() => setAccent(occasion.id)}
            onFocus={() => setAccent(occasion.id)}
          >
            <SpotlightCard
              accent={occasion.accent}
              className="occasion-card h-full"
            >
              <Link
                href={`/criar/${occasion.slug}`}
                onClick={() =>
                  void track("occasion_selected", {
                    occasion: occasion.id,
                    from: "landing_grid",
                  })
                }
                className="occasion-card__link"
              >
                <span
                  className="occasion-card__icon"
                  style={{ color: `rgb(${occasion.accent})` }}
                >
                  <OccasionIcon name={occasion.icon} />
                </span>

                <span className="occasion-card__name">{occasion.name}</span>
                <span className="occasion-card__cta">
                  {copy.occasions.cta} →
                </span>
              </Link>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
