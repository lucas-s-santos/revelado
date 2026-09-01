import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  /*
   * Onde a build mora. Padrão `.next`; qualquer outro valor vem do ambiente.
   *
   * `next dev` e `next build` escrevem no MESMO diretório, e um sobrescreve o
   * outro sem avisar. Com um servidor de desenvolvimento aberto e uma build de
   * produção rodando ao lado, o resultado não é um erro: é o servidor de
   * produção passando a devolver **HTTP 400 em todo CSS e todo JS**, porque os
   * arquivos que o HTML pede deixaram de existir. A página abre sem estilo
   * nenhum e parece que o site quebrou.
   *
   * Isso aconteceu de verdade, três vezes em um dia — e uma delas foi a razão
   * de a landing parecer "feia e falha" numa avaliação. Também é a origem dos
   * `Failed to collect page data for /icon.png` que apareciam do nada.
   *
   * Com esta linha, uma verificação de produção roda em outro diretório e os
   * dois convivem:
   *
   *     NEXT_DIST_DIR=.next-verify pnpm build
   *     NEXT_DIST_DIR=.next-verify pnpm next start -p 3010
   *
   * `pnpm dev` continua no `.next` de sempre, sem nada a fazer.
   */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  /*
   * O sharp fica FORA do bundle do servidor.
   *
   * Ele é um módulo nativo: o pacote JS carrega um .node compilado por
   * plataforma (@img/sharp-win32-x64 aqui). Empacotado pelo Next, a resolução
   * desse binário quebra — o dev server derrubava a rota da opengraph-image
   * com "Ensure your package manager supports multi-platform installation",
   * embora um require("sharp") normal funcionasse fora do Next.
   *
   * Vale para produção também, e não só para o dev: a mesma rota gera a
   * imagem que o WhatsApp mostra quando o link chega.
   */
  serverExternalPackages: ["sharp"],
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
