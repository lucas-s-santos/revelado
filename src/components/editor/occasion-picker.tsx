"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OccasionIcon } from "@/components/marketing/occasion-icon";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { track } from "@/lib/analytics";
import { OCCASIONS } from "@/lib/occasions";

/**
 * Grid de ocasiões que cria o rascunho — SPEC 8.2.
 *
 * Aceite da tela: "rascunho criado no servidor **antes** da navegação". Por isso
 * o clique espera o POST responder. Enquanto espera, o card mostra o estado —
 * ninguém fica olhando para uma tela parada sem saber se clicou.
 */
export function OccasionPicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(occasionId: string) {
    if (creating) return;

    setCreating(occasionId);
    setError(null);
    void track("occasion_selected", { occasion: occasionId, from: "criar" });

    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion: occasionId }),
      });

      if (!response.ok) throw new Error();

      const draft = (await response.json()) as { id: string };
      router.push(`/editor/${draft.id}`);
    } catch {
      setCreating(null);
      // Erro explica o que houve e o que fazer (SPEC 11).
      setError(
        "Não deu para começar sua página agora. Verifique a conexão e toque de novo.",
      );
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="create-page__error">
          {error}
        </p>
      ) : null}

      <ul className="create-page__grid">
        {OCCASIONS.map((occasion) => (
          <li key={occasion.id} data-occasion={occasion.id}>
            <SpotlightCard accent={occasion.accent} className="h-full">
              <button
                type="button"
                onClick={() => void choose(occasion.id)}
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
