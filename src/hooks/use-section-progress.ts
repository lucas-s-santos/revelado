"use client";

import { useEffect, type RefObject } from "react";

import { subscribeScroll } from "@/hooks/use-scroll-driver";

/**
 * Progresso de uma seção no scroll, 0..1 — SPEC 6.3.
 *
 * Escreve o valor numa CSS custom property do próprio elemento e **não**
 * re-renderiza nada. O efeito (parallax, revelação, trilho) resolve em CSS.
 * É assim que a "assinatura" da landing roda com zero JS por frame.
 *
 * 0 = topo do elemento entrando pela base da viewport.
 * 1 = base do elemento saindo pelo topo.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  options: {
    /** nome da custom property escrita no elemento */
    property?: string;
    /** margem em px aplicada aos dois extremos, encurtando o trecho útil */
    inset?: number;
    /** desliga o cálculo (ex.: prefers-reduced-motion) */
    enabled?: boolean;
    /** recebe o progresso quando precisar de JS de verdade */
    onProgress?: (progress: number) => void;
  } = {},
): void {
  const { property = "--p", inset = 0, enabled = true, onProgress } = options;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    let last = -1;

    return subscribeScroll(({ viewport }) => {
      const rect = node.getBoundingClientRect();
      const span = rect.height + viewport - inset * 2;
      if (span <= 0) return;

      const travelled = viewport - inset - rect.top;
      const progress = Math.min(Math.max(travelled / span, 0), 1);

      // 3 casas: evita escrever no DOM a cada micro-fração de pixel.
      const rounded = Math.round(progress * 1000) / 1000;
      if (rounded === last) return;
      last = rounded;

      node.style.setProperty(property, String(rounded));
      onProgress?.(rounded);
    });
  }, [ref, property, inset, enabled, onProgress]);
}
