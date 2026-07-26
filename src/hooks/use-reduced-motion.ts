"use client";

import { useSyncExternalStore } from "react";

/**
 * SPEC 6.1 regra 5 — `prefers-reduced-motion` desliga tudo. Não é opcional.
 *
 * useSyncExternalStore para não hidratar errado: no servidor o valor é `false`
 * (o CSS já neutraliza as transições) e o cliente corrige no primeiro commit.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Ponteiro grosso: SPEC 6.4 desliga Lens e Focus Cards em touch. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(pointer: coarse)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}
