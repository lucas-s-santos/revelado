"use client";

import { useEffect } from "react";

import { subscribePointer } from "@/hooks/use-pointer";
import { useCoarsePointer, useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * A luz de segurança do laboratório — SPEC 6.3, landing/hero.
 *
 * Um `div fixed` com radial-gradient e mix-blend-mode: screen que consome
 * `--mx`/`--my` escritos pelo driver de ponteiro. **Um listener para a página
 * toda**; este componente só liga o driver e sai da frente.
 *
 * Componente-folha, não recebe children: o layout que o usa continua Server
 * Component (SPEC 12 regra 4).
 */
export function Safelight() {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const enabled = !reduced && !coarse;

  useEffect(() => {
    if (!enabled) return;
    // Assinatura vazia: o efeito é 100% CSS, só precisamos do driver ligado.
    return subscribePointer(() => {});
  }, [enabled]);

  if (!enabled) return null;

  return <div aria-hidden className="safelight" />;
}
