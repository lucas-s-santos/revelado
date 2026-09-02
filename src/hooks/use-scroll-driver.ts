"use client";

import { useEffect } from "react";

/**
 * Driver único de scroll — SPEC 6.4.
 *
 * Um listener passivo para a aplicação inteira, throttled por rAF, com um Set de
 * subscribers. Nenhum outro componente pode registrar `scroll`: o ESLint reprova
 * (ver eslint.config.mjs). Este arquivo e use-pointer são as duas exceções.
 *
 * Também escreve `--scroll` (0..1) no :root, para quem quiser resolver o efeito
 * só com CSS, sem JS por frame.
 */

export interface ScrollState {
  /** scrollY em px */
  y: number;
  /** progresso do documento inteiro, 0..1 */
  progress: number;
  /** altura da viewport em px */
  viewport: number;
  /** altura total rolável em px */
  scrollable: number;
  /** px desde o último frame — negativo ao subir */
  delta: number;
}

type Subscriber = (state: ScrollState) => void;

const subscribers = new Set<Subscriber>();

const state: ScrollState = {
  y: 0,
  progress: 0,
  viewport: 0,
  scrollable: 0,
  delta: 0,
};

let frame = 0;
let listening = false;
let lastY = 0;

function measure() {
  frame = 0;

  const y = window.scrollY;
  const viewport = window.innerHeight;
  const scrollable = Math.max(
    document.documentElement.scrollHeight - viewport,
    0,
  );

  state.delta = y - lastY;
  state.y = y;
  state.viewport = viewport;
  state.scrollable = scrollable;
  state.progress =
    scrollable > 0 ? Math.min(Math.max(y / scrollable, 0), 1) : 0;
  lastY = y;

  document.documentElement.style.setProperty(
    "--scroll",
    state.progress.toFixed(4),
  );
  // Em px brutos, e não só o progresso 0..1. Um efeito preso à primeira dobra
  // (o mascote do hero, por exemplo) não pode depender do tamanho da página
  // inteira: em uma landing curta, --scroll chega a 0.3 em 200px rolados; numa
  // longa, os mesmos 200px dão 0.03. --scroll-px é o mesmo em qualquer altura
  // de documento.
  document.documentElement.style.setProperty("--scroll-px", `${y}px`);

  for (const subscriber of subscribers) subscriber(state);
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(measure);
}

function start() {
  if (listening) return;
  listening = true;
  lastY = window.scrollY;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  measure();
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** Assina o driver. Devolve a função de cancelamento. */
export function subscribeScroll(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  start();
  // Entrega o estado atual imediatamente: quem assina no meio da página não
  // fica esperando o próximo scroll para se posicionar.
  subscriber(state);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stop();
  };
}

export function getScrollState(): Readonly<ScrollState> {
  return state;
}

/** Diagnóstico da /dev/motion: quantos assinantes para quantos listeners. */
export function getScrollDriverStats(): {
  subscribers: number;
  listeners: number;
} {
  return { subscribers: subscribers.size, listeners: listening ? 1 : 0 };
}

/**
 * Versão hook. O callback roda a cada frame com scroll ativo — não chame
 * setState nele sem necessidade (SPEC 6.4: zero JS por frame quando der para
 * resolver em CSS).
 */
export function useScrollDriver(subscriber: Subscriber, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return subscribeScroll(subscriber);
  }, [subscriber, enabled]);
}
