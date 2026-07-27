"use client";

import type { ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

/**
 * Revelação por scroll — SPEC 5.3, 6.3 e 8.8.
 *
 * CSS puro + IntersectionObserver, **sem** o Motion: o efeito é só `opacity` e
 * `translateY`, que a transição do CSS faz igual. E isso importa muito na página
 * publicada, onde o orçamento é 120 KB de JS (SPEC 10) e o Motion sozinho
 * custaria uns 40 KB. Como o mesmo componente serve a landing e a página
 * publicada, os dois ganham.
 *
 * Easing, não spring: é entrada, não interação (SPEC 6.1 regra 4).
 * `once: true` sempre que possível — nada re-anima ao rolar de volta.
 */
export interface RevealProps {
  /** deslocamento inicial em px, default 22 */
  y?: number;
  /** atraso em segundos */
  delay?: number;
  /** índice na lista, para o stagger de 60ms da SPEC 6.3 */
  index?: number;
  once?: boolean;
  /**
   * false = nasce visível, sem observer. Usado pelo preview do editor: dentro
   * de um mockup de 40vh a revelação por scroll atrapalharia a edição, e o DOM
   * continua o mesmo da página publicada.
   */
  animate?: boolean;
  className?: string;
  children: ReactNode;
}

/** SPEC 6.3 / 8.8 — stagger de 60ms. */
const STAGGER_MS = 60;

export function Reveal({
  y = 22,
  delay = 0,
  index = 0,
  once = true,
  animate = true,
  className,
  children,
}: RevealProps) {
  const reduced = useReducedMotion();
  const enabled = animate && !reduced;
  const { ref, visible } = useReveal<HTMLDivElement>({ once, enabled });

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      data-visible={!enabled || visible ? "" : undefined}
      style={
        {
          "--reveal-y": `${y}px`,
          "--reveal-delay": `${delay * 1000 + index * STAGGER_MS}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
