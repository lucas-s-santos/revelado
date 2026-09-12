"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { track } from "@/lib/analytics";
import { OCCASIONS } from "@/lib/occasions";

/**
 * Grid de ocasiões — SPEC 8.2.
 *
 * O clique leva para `/criar/[occasion]`, a escolha do template (SPEC 8.3). O
 * rascunho nasce lá, um clique depois — ver a divergência anotada na própria
 * `/criar/[occasion]/page.tsx`.
 *
 * Navegação e não `fetch`: a página de destino é estática, então o clique é
 * instantâneo e não há estado de espera para mostrar.
 */
export function OccasionPicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  function choose(occasionId: string) {
    if (creating) return;

    setCreating(occasionId);
    void track("occasion_selected", { occasion: occasionId, from: "criar" });

    router.push(`/criar/${occasionId}`);
  }

  return (
    <>
      <ul className="create-page__grid">
        {OCCASIONS.map((occasion) => (
          <li key={occasion.id} data-occasion={occasion.id}>
            <SpotlightCard accent={occasion.accent} className="h-full">
              <button
                type="button"
                onClick={() => choose(occasion.id)}
                disabled={creating !== null}
                aria-busy={creating === occasion.id}
                className="occasion-card__link w-full text-left"
              >
                <span
                  className="occasion-card__icon"
                  style={{ color: `rgb(${occasion.accent})` }}
                >
                  <OccasionIcon name={occasion.icon} />
                </span>

                <span className="occasion-card__name">{occasion.name}</span>

                <span className="occasion-card__cta" data-always>
                  {creating === occasion.id ? "criando…" : "começar →"}
                </span>
              </button>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </>
  );
}
