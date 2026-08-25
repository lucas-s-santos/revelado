import Link from "next/link";

import { StartButton } from "@/components/marketing/start-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { DEMO_SLUG } from "@/lib/blocks/fixtures";
import { copy } from "@/lib/copy";

/**
 * Hero — SPEC 8.1 seção 3.
 *
 * Server Component; só o ticker é cliente.
 *
 * O mascote ocupa o lugar que era da foto do pôr do sol. A foto tinha sido
 * graduada para a identidade antiga (creme e framboesa) e ficou fora de tom
 * depois da repintura; mantê-la com o mascote ao lado colocaria três elementos
 * ambientais disputando a mesma dobra, contra o teto de dois da SPEC 6.1.
 *
 * O mockup do celular saiu daqui antes, para a `PhoneShowcase`: dividindo a
 * dobra com o h1 ele chegava pequeno demais para alguém ler o que está dentro.
 */
export function Hero({ pagesCreated }: { pagesCreated: number }) {
  return (
    <section className="hero">
      <div className="container-page hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">{copy.hero.eyebrow}</p>

          <h1 className="hero__title">
            {copy.hero.titleLead}{" "}
            <span className="display-italic">{copy.hero.titleAccent}</span>{" "}
            {copy.hero.titleTail}
          </h1>

          <p className="hero__lede">{copy.hero.lede}</p>

          <div className="hero__actions">
            <StartButton />

            <Link href={`/p/${DEMO_SLUG}`} className="btn-quiet">
              {copy.hero.secondary}
            </Link>
          </div>

          <p className="hero__social">
            {copy.hero.socialPrefix}{" "}
            <NumberTicker
              value={pagesCreated}
              className="text-[rgb(var(--color-ink))]"
            />{" "}
            {copy.hero.socialSuffix}
          </p>

          <p className="hero__note">{copy.hero.noLogin}</p>
        </div>

        <Mascote />
      </div>
    </section>
  );
}

/**
 * O mascote, preparado por `scripts/prepare-nimbo.mjs`.
 *
 * O PNG de origem tem 1,1 MB e vem com as órbitas dos olhos **transparentes** —
 * sobre a pele clara elas viravam dois ovais da cor da página e ele ficava
 * cego. O script acha os furos, desenha o olhar e exporta AVIF/WebP em duas
 * larguras: 42 KB no maior, contra o teto de 250 KB da SPEC 10.
 *
 * Decorativo: o `h1` já diz o que a página é, então `alt` vazio evita que o
 * leitor de tela anuncie um desenho antes do título (SPEC 11).
 */
function Mascote() {
  return (
    <div className="hero__mascot">
      <span aria-hidden className="hero__mascot-glow" />

      <picture>
        <source
          type="image/avif"
          srcSet="/nimbo-240.avif 240w, /nimbo.avif 420w"
          sizes="(max-width: 767px) 240px, 420px"
        />
        <source
          type="image/webp"
          srcSet="/nimbo-240.webp 240w, /nimbo.webp 420w"
          sizes="(max-width: 767px) 240px, 420px"
        />
        <img
          src="/nimbo.webp"
          alt=""
          width={420}
          height={448}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </div>
  );
}
