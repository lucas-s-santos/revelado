"use client";

import { useEffect } from "react";

import { subscribeScroll } from "@/hooks/use-scroll-driver";

/**
 * Barra de progresso do topo — SPEC 6.3.
 *
 * O SPEC deixa escolher entre o Scroll Progress da Magic UI e "scaleX num ref".
 * Ficou o próprio: o componente da Magic UI monta o próprio `useScroll` do
 * Motion, ou seja, um segundo listener de scroll — exatamente o que a regra do
 * listener único proíbe (SPEC 6.4). Aqui o driver já escreve `--scroll` no
 * :root e a barra é só `scaleX(var(--scroll))`: zero JS por frame.
 */
export function ScrollProgress() {
  useEffect(() => subscribeScroll(() => {}), []);

  return (
    <div aria-hidden className="scroll-progress">
      <span className="scroll-progress__fill" />
    </div>
  );
}
