import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Composição de classes Tailwind (padrão shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** SPEC 12 — valores monetários em centavos, inteiros. Nunca float. */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** SPEC 12 — UTC no banco, America/Sao_Paulo na exibição. */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...options,
  }).format(value);
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Interpolação usada pelos hooks de scroll/pointer da Fase 1. */
export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

/** Normaliza um valor para 0..1 dentro de um intervalo. */
export const progress = (value: number, from: number, to: number) =>
  to === from ? 0 : clamp((value - from) / (to - from), 0, 1);

/** Debounce simples — usado no autosave do editor (SPEC 8.4). */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}
