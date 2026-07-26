"use client";

import { useEffect } from "react";

/**
 * Driver único de ponteiro — SPEC 6.3 e 6.4.
 *
 * Um listener passivo de `pointermove` para a aplicação inteira, throttled por
 * rAF, escrevendo `--mx` / `--my` (px) e `--mxn` / `--myn` (0..1) no :root. A
 * safelight da landing consome isso em CSS puro, sem re-render.
 *
 * Componentes que precisam da posição (SpotlightCard, Magnetic) assinam aqui —
 * e só enquanto o ponteiro está dentro deles (SPEC 6.4).
 */

export interface PointerState {
  x: number;
  y: number;
  /** normalizado pela viewport, 0..1 */
  nx: number;
  ny: number;
  /** false até o primeiro movimento: evita efeito piscando no canto superior */
  active: boolean;
}

type Subscriber = (state: PointerState) => void;

const subscribers = new Set<Subscriber>();

const state: PointerState = { x: 0, y: 0, nx: 0.5, ny: 0.5, active: false };

let frame = 0;
let listening = false;
let pendingX = 0;
let pendingY = 0;

function flush() {
  frame = 0;

  state.x = pendingX;
  state.y = pendingY;
  state.nx = window.innerWidth > 0 ? pendingX / window.innerWidth : 0.5;
  state.ny = window.innerHeight > 0 ? pendingY / window.innerHeight : 0.5;
  state.active = true;

  const root = document.documentElement.style;
  root.setProperty("--mx", `${pendingX}px`);
  root.setProperty("--my", `${pendingY}px`);
  root.setProperty("--mxn", state.nx.toFixed(4));
  root.setProperty("--myn", state.ny.toFixed(4));

  for (const subscriber of subscribers) subscriber(state);
}

function onPointerMove(event: PointerEvent) {
  pendingX = event.clientX;
  pendingY = event.clientY;
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener("pointermove", onPointerMove, { passive: true });
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("pointermove", onPointerMove);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** Assina o driver. Devolve a função de cancelamento. */
export function subscribePointer(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  start();
  if (state.active) subscriber(state);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stop();
  };
}

export function getPointerState(): Readonly<PointerState> {
  return state;
}

/** Diagnóstico da /dev/motion: quantos assinantes para quantos listeners. */
export function getPointerDriverStats(): {
  subscribers: number;
  listeners: number;
} {
  return { subscribers: subscribers.size, listeners: listening ? 1 : 0 };
}

export function usePointer(subscriber: Subscriber, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return subscribePointer(subscriber);
  }, [subscriber, enabled]);
}
