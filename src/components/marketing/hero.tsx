import Link from "next/link";

import { StartButton } from "@/components/marketing/start-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { DEMO_SLUG } from "@/lib/blocks/fixtures";
import { copy } from "@/lib/copy";

/**
 * Hero — SPEC 8.1 seção 3.
 *
 * Server Component; só o mockup e o ticker são clientes.
 *
 * Efeitos na dobra: a safelight global e a foto. O cone do `Spotlight` saiu
 * quando a foto entrou — o sol revelado já é um cone de luz âmbar, e dois
 * gradientes disputando a mesma área estouravam o teto da SPEC 6.1.
 *
 * O mockup do celular saiu daqui para a `PhoneShowcase` logo abaixo: dividindo
 * a dobra com o h1 ele chegava pequeno demais para alguém ler o que está
 * dentro. O hero ficou com o texto e a ação, centralizados.
 */
export function Hero({ pagesCreated }: { pagesCreated: number }) {
  return (
    <section className="hero">
      <HeroPhoto />

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
      </div>
    </section>
  );
}

/**
 * A foto do hero, revelada por `scripts/prepare-hero.mjs`.
 *
 * Direção de arte de verdade, com `<picture>`: no celular vai o recorte
 * retrato, fechado nos dois; no desktop vai o **céu**, sem gente, porque o
 * casal já está dentro do mockup ao lado e repetir as mesmas duas pessoas em
 * escalas diferentes na mesma dobra confunde. Um `next/image` só resolveria a
 * resolução, não o enquadramento — e 90% do tráfego é mobile (SPEC 1).
 *
 * Decorativa: o `h1` já diz tudo, então `alt` vazio evita que o leitor de tela
 * leia uma descrição redundante antes do título (SPEC 11).
 *
 * As bordas já foram sangradas para `--color-bg` na gradação, então a foto
 * termina na cor do fundo — não há máscara nem overlay em CSS por cima.
 */
function HeroPhoto() {
  return (
    <picture className="hero__photo">
      <source
        media="(max-width: 767px)"
        type="image/avif"
        srcSet="/hero-portrait-480.avif 480w, /hero-portrait.avif 720w"
        sizes="100vw"
      />
      <source
        media="(max-width: 767px)"
        type="image/webp"
        srcSet="/hero-portrait-480.webp 480w, /hero-portrait.webp 720w"
        sizes="100vw"
      />
      <source
        type="image/avif"
        srcSet="/hero-sky-480.avif 480w, /hero-sky.avif 718w"
        sizes="62vw"
      />
      <source
        type="image/webp"
        srcSet="/hero-sky-480.webp 480w, /hero-sky.webp 718w"
        sizes="62vw"
      />
      <img
        src="/hero-sky.webp"
        alt=""
        width={718}
        height={780}
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
