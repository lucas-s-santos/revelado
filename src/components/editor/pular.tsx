"use client";

import { ArrowRight } from "lucide-react";

import { useEditorStore } from "@/stores/editor-store";

/**
 * "Pular — continuar sem X", nas etapas opcionais.
 *
 * O botão de adicionar já existia; o de recusar, não. E a diferença entre os
 * dois não é de conveniência: sem um jeito explícito de dizer "não quero", a
 * pessoa fica na dúvida se pode seguir sem aquilo, e a dúvida no meio de um
 * fluxo de oito minutos é onde ele se perde. Dizer não em voz alta é mais
 * rápido que descobrir sozinho que dava para não dizer nada.
 *
 * Não apaga nem desliga nada — só avança. Quem pular e mudar de ideia volta
 * pela bolinha lá em cima, e o bloco continua disponível.
 */
export function Pular({ texto }: { texto: string }) {
  const step = useEditorStore((state) => state.step);
  const setStep = useEditorStore((state) => state.setStep);

  return (
    <button
      type="button"
      onClick={() => setStep(step + 1)}
      className="pular"
    >
      <ArrowRight size={14} aria-hidden />
      Pular — {texto}
    </button>
  );
}
