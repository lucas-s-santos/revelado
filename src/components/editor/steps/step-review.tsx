"use client";

import { Check, CircleAlert } from "lucide-react";

import { validateForPublish, type BlockType } from "@/lib/blocks/schema";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Passo de revisão — o último antes do checkout.
 *
 * Usa o **mesmo** `validateForPublish` que o checkout usa. Escrever checagens
 * próprias aqui faria a revisão dizer "tudo pronto" para uma página que a rota
 * de pagamento recusa em seguida — e descobrir isso na tela de pagar é o pior
 * momento possível.
 *
 * Cada pendência leva ao passo onde ela se resolve: apontar o problema sem
 * apontar o caminho é metade do trabalho.
 */

/** Onde cada tipo de bloco é editado, para o atalho da pendência. */
const STEP_OF_BLOCK: Partial<Record<BlockType, number>> = {
  hero: 1,
  counter: 2,
  gallery: 3,
  letter: 4,
  music: 5,
  timeline: 6,
  // Quiz, motivos e cápsula moram todos no passo "Extras" agora.
  quiz: 7,
  reasons: 7,
  capsule: 7,
};

export function StepReview() {
  const content = useEditorStore((state) => state.content);
  const setStep = useEditorStore((state) => state.setStep);

  if (!content) return null;

  const issues = validateForPublish(content);
  const tudoPronto = issues.length === 0;

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">
          {tudoPronto ? "Está pronta." : "Falta pouco."}
        </h2>
        <p className="step__lede">
          {tudoPronto
            ? "Role o celular ao lado uma última vez. É exatamente isso que ela vai ver."
            : "Estas são as pendências que impedem a publicação. Clique para ir direto ao ponto."}
        </p>
      </header>

      {tudoPronto ? (
        <p className="step__ok">
          <Check size={16} aria-hidden />
          Nada pendente. O preview é grátis — você só paga para publicar.
        </p>
      ) : (
        <ul className="issues">
          {issues.map((issue) => {
            const bloco = content.blocks.find((b) => b.id === issue.blockId);
            const destino = bloco ? STEP_OF_BLOCK[bloco.type] : undefined;

            return (
              <li key={`${issue.blockId}-${issue.message}`}>
                <button
                  type="button"
                  onClick={() =>
                    destino !== undefined ? setStep(destino) : undefined
                  }
                  disabled={destino === undefined}
                  className="issue"
                >
                  <CircleAlert size={16} aria-hidden className="issue__icon" />
                  <span>{issue.message}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
