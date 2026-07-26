"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import { subscribePointer } from "@/hooks/use-pointer";

/**
 * Halo que segue o ponteiro dentro de um elemento — SPEC 5.3 (SpotlightCard).
 *
 * Escreve `--sx` / `--sy` no próprio nó, **sem re-render do React**, e só
 * assina o driver de ponteiro enquanto o ponteiro está dentro (SPEC 6.4:
 * "efeitos de hover em card escutam apenas enquanto o ponteiro está dentro").
 *
 * `will-change` entra ao passar o ponteiro e sai ao tirar — nunca fica ligado
 * na lista inteira.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>(
  enabled = true,
): {
  ref: RefObject<T | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
} {
  const ref = useRef<T>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  const onPointerLeave = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;

    const node = ref.current;
    if (!node) return;
    node.style.removeProperty("will-change");
    node.dataset.spotlight = "off";
  }, []);

  const onPointerEnter = useCallback(() => {
    if (!enabled || unsubscribe.current) return;

    const node = ref.current;
    if (!node) return;

    node.style.setProperty("will-change", "transform");
    node.dataset.spotlight = "on";

    unsubscribe.current = subscribePointer(({ x, y }) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--sx", `${x - rect.left}px`);
      node.style.setProperty("--sy", `${y - rect.top}px`);
    });
  }, [enabled]);

  // Desmontar com o ponteiro dentro não pode deixar subscriber órfão no Set.
  useEffect(() => onPointerLeave, [onPointerLeave]);

  return { ref, onPointerEnter, onPointerLeave };
}
