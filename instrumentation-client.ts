/**
 * Sentry no browser — SPEC 10.
 *
 * O SDK do Sentry sozinho pesa ~127 KB gzip, mais da metade do orçamento de JS
 * da landing (220 KB) e mais do que o orçamento inteiro da página publicada
 * (120 KB). Por isso ele entra por import dinâmico: vira um chunk assíncrono
 * fora do First Load JS e só é baixado quando existe DSN configurado.
 *
 * Custo aceito: erro nos primeiros milissegundos, antes do chunk chegar, não é
 * capturado. A página publicada abrir rápido vale mais (SPEC 1 e 8.8).
 */
// import type: apagado na compilação, não puxa nada para o bundle.
import type * as SentryModule from "@sentry/nextjs";

let sentry: typeof SentryModule | undefined;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((mod) => {
    sentry = mod;
    mod.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
      // Replay desligado: não cabe no orçamento (SPEC 10).
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false, // LGPD (SPEC 9.4)
    });
  });
}

export function onRouterTransitionStart(
  ...args: Parameters<typeof SentryModule.captureRouterTransitionStart>
) {
  sentry?.captureRouterTransitionStart(...args);
}
