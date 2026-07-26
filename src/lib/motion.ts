/**
 * Presets de motion — SPEC 6.2. Valores travados: mudar aqui muda a aplicação
 * inteira, e é para ser assim.
 *
 * Spring para interação, easing para entrada (SPEC 6.1 regra 4).
 */

export const spring = {
  snappy: { type: "spring", stiffness: 400, damping: 30 }, // botões, toggles
  smooth: { type: "spring", stiffness: 150, damping: 20 }, // magnético, drag
  gentle: { type: "spring", stiffness: 90, damping: 18 }, // layout shift
  bouncy: { type: "spring", stiffness: 300, damping: 12 }, // confete, sucesso
} as const;

export const ease = {
  out: [0.16, 0.84, 0.44, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** SPEC 6.2 — nada passa de 800ms. */
export const duration = {
  fast: 0.18, // micro-interação
  base: 0.32, // transição de componente
  slow: 0.62, // revelação de seção
} as const;

/** Stagger padrão da revelação de blocos (SPEC 6.3 / 8.8). */
export const STAGGER = 0.06;
