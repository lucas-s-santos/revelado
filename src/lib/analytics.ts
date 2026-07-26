/**
 * Funil do PostHog — SPEC 14. Configurado desde o dia 1, instrumentado a partir
 * da Fase 2. Os nomes dos eventos são contrato: mudá-los quebra o funil salvo
 * no PostHog, então eles vivem aqui e em nenhum outro lugar.
 */

export const FUNNEL_EVENTS = [
  "landing_view",
  "occasion_selected",
  "editor_opened",
  "editor_completed",
  "checkout_opened",
  "payment_started",
  "payment_confirmed",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Eventos fora do funil principal. */
export type AuxEvent =
  | "template_selected"
  | "photos_uploaded"
  | "coupon_applied"
  | "site_published"
  | "site_first_viewed"
  | "share_clicked"
  | "qr_downloaded";

export type AnalyticsEvent = FunnelEvent | AuxEvent;

export type EventProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const ANALYTICS_ENABLED = Boolean(POSTHOG_KEY);

/**
 * Captura um evento no cliente. No-op sem chave configurada, para o projeto
 * rodar em dev sem credencial. Import dinâmico: o posthog-js não entra no
 * bundle de quem não chama (orçamento de JS — SPEC 10).
 */
export async function track(
  event: AnalyticsEvent,
  props?: EventProps,
): Promise<void> {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;
  const { default: posthog } = await import("posthog-js");
  posthog.capture(event, props);
}

export async function identify(
  distinctId: string,
  props?: EventProps,
): Promise<void> {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;
  const { default: posthog } = await import("posthog-js");
  posthog.identify(distinctId, props);
}
