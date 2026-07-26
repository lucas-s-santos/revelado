import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

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
