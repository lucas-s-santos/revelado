import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/**
 * Cabeçalhos de segurança — SPEC 9.4.
 *
 * Antes não havia nenhum: qualquer site podia embutir o checkout num iframe
 * invisível (clickjacking), o navegador podia adivinhar o tipo de um arquivo
 * servido e a URL completa da página publicada vazava no `referer` para todo
 * link externo — inclusive o slug, que é o que separa a página de quem não
 * deveria vê-la.
 *
 * A CSP lista o que o app **de fato** carrega: fontes são self-host do
 * `next/font`, o único embed externo é Spotify/YouTube (SPEC, regra 10: nunca
 * hospedar áudio) e as fotos vêm do host público do R2.
 *
 * `'unsafe-inline'` em `script-src` é o preço de não ter middleware: o Next
 * injeta o script de hidratação inline e a alternativa é nonce por requisição,
 * que obrigaria toda página a virar dinâmica — e a página publicada é estática
 * por decisão de produto (SPEC 8.8). Quando houver middleware, troque por nonce.
 */
const R2_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST
  ? `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_HOST}`
  : "";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const csp = [
  `default-src 'self'`,
  // `unsafe-eval` só em desenvolvimento: é o que o Fast Refresh usa.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${R2_HOST}`.trim(),
  `font-src 'self' data:`,
  `connect-src 'self' ${POSTHOG_HOST} https://*.sentry.io ${R2_HOST}`.trim(),
  // Spotify e YouTube: o embed oficial é a única forma de música (regra 10).
  `frame-src https://open.spotify.com https://www.youtube.com https://www.youtube-nocookie.com`,
  `media-src 'self' ${R2_HOST}`.trim(),
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // Ninguém embute o Revelado: o checkout dentro de iframe alheio é golpe.
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // O slug é segredo: não vai junto no `referer` de um link para fora.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // SPEC 6.4 — variantes 400/800/1600 em AVIF/WebP.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 800, 1200, 1600],
    remotePatterns: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST
      ? [
          {
            protocol: "https",
            hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST,
          },
        ]
      : [],
  },
  experimental: {
    // Tree-shaking dos barrels dessas libs (orçamento de JS — SPEC 10).
    optimizePackageImports: ["motion", "lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Só faz upload de sourcemap quando há token — build local e CI sem segredo
  // não quebram.
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
  // SPEC 10 — o SDK do Sentry é o item mais pesado do bundle. Session Replay
  // está desligado (sample rate 0), então nada dele precisa ser embarcado.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
  webpack: { treeshake: { removeDebugLogging: true } },
});
