import Link from "next/link";

import { StartButton } from "@/components/marketing/start-button";
import { GradientWaves } from "@/components/motion/gradient-waves";
import { StageIntro } from "@/components/motion/stage-intro";
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
      {/* Fora do StageIntro de propósito: é fundo, não ator. Entrar junto com
          o título faria a dobra começar com dois movimentos concorrentes. */}
      <GradientWaves className="hero__ondas" />

      {/* data-intro numera a ORDEM DE ENTRADA, não a ordem do DOM: o mascote
          vem primeiro na coreografia e por último no documento. */}
      <StageIntro className="container-page hero__inner">
        <div className="hero__copy">
          <p data-intro="2" className="eyebrow">
            {copy.hero.eyebrow}
          </p>

          <h1 data-intro="3" className="hero__title">
            {copy.hero.titleLead}{" "}
            <span className="display-italic">{copy.hero.titleAccent}</span>{" "}
            {copy.hero.titleTail}
          </h1>

          <p data-intro="4" className="hero__lede">
            {copy.hero.lede}
          </p>

          <div data-intro="5" className="hero__actions">
            <StartButton />

            <Link href={`/p/${DEMO_SLUG}`} className="btn-quiet">
              {copy.hero.secondary}
            </Link>
          </div>

          {/* Prova e garantia numa linha só. Eram dois parágrafos empilhados,
              e somados à lede antiga davam seis linhas de texto miúdo entre o
              h1 e o fim da dobra — mais leitura do que a dobra precisa. */}
          <p data-intro="6" className="hero__social">
            <NumberTicker
              value={pagesCreated}
              className="text-[rgb(var(--color-ink))]"
            />{" "}
            {copy.hero.socialSuffix} · {copy.hero.noLogin}
          </p>
        </div>

        <Mascote />
      </StageIntro>
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
    <div data-intro="1" data-intro-lead className="hero__mascot">
      {/* O pilar de luz que ficava aqui saiu quando as ondas entraram. Os dois
          eram gradiente rosa-violeta na mesma dobra, um por cima do outro, e
          somados viravam mancha — além de serem o terceiro efeito ambiental
          numa tela onde o teto é dois. As ondas fazem o mesmo trabalho de cor,
          na largura inteira. */}
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
