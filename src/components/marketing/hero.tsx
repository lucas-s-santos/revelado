import Link from "next/link";

import { HeroPhone } from "@/components/marketing/hero-phone";
import { Magnetic } from "@/components/motion/magnetic";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Spotlight } from "@/components/ui/spotlight-new";
import { copy } from "@/lib/copy";

/**
 * Hero — SPEC 8.1 seção 3.
 *
 * Server Component; só o mockup, o botão magnético e o ticker são clientes.
 * Dois efeitos ambientais na dobra (safelight global + cone do Spotlight), que
 * é o teto da SPEC 6.1.
 */
export function Hero({
  pagesCreated,
  counterSince,
  now,
}: {
  pagesCreated: number;
  counterSince: string;
  now: number;
}) {
  return (
    <section className="hero">
      <Spotlight />

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
            <Magnetic>
              <Link href="/criar" className="btn-primary">
                {copy.hero.cta}
              </Link>
            </Magnetic>

            <Link href="/exemplos/namorados" className="btn-quiet">
              {copy.hero.secondary}
            </Link>
          </div>

          <p className="hero__social">
            {copy.hero.socialPrefix}{" "}
            <NumberTicker
              value={pagesCreated}
              className="text-[rgb(var(--color-paper))]"
            />{" "}
            {copy.hero.socialSuffix}
          </p>

          <p className="hero__note">{copy.hero.noLogin}</p>
        </div>

        <HeroPhone since={counterSince} now={now} />
      </div>
    </section>
  );
}
