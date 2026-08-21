import { Eye, Timer, Wallet } from "lucide-react";
import type { ComponentType } from "react";

import { HeroPhone } from "@/components/marketing/hero-phone";
import { copy } from "@/lib/copy";

/**
 * O mockup grande, sozinho na seção — SPEC 8.1.
 *
 * O celular saiu do hero e veio para cá de propósito. No hero ele dividia a
 * dobra com o h1 e os dois CTAs e chegava pequeno demais para alguém ler o que
 * está dentro; aqui ele é o assunto da seção inteira e cabe em tamanho de ler.
 * O hero ficou com o texto e a ação, que é o trabalho dele.
 *
 * Server Component: só o mockup é cliente, porque o contador precisa do tique.
 */

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  rapido: Timer,
  preview: Eye,
  pagamento: Wallet,
};

export function PhoneShowcase({ since, now }: { since: string; now: number }) {
  return (
    <section className="section showcase">
      <header className="section__head showcase__head">
        <p className="eyebrow">{copy.showcase.eyebrow}</p>
        <h2 className="section__title">{copy.showcase.title}</h2>
        <p className="section__lede">{copy.showcase.lede}</p>
      </header>

      <div className="showcase__stage">
        <HeroPhone since={since} now={now} />
      </div>

      <ul className="showcase__badges">
        {copy.showcase.badges.map((badge) => {
          const Icon = ICONS[badge.id];

          return (
            <li key={badge.id} className="showcase__badge">
              <span aria-hidden className="showcase__badge-icon">
                {Icon ? <Icon size={18} /> : null}
              </span>

              <div>
                <h3 className="showcase__badge-name">{badge.name}</h3>
                <p className="showcase__badge-text">{badge.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
