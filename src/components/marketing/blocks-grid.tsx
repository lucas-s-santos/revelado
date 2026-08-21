import {
  BookHeart,
  CalendarClock,
  Images,
  ListOrdered,
  Lock,
  MapPin,
  Music,
  Timer,
} from "lucide-react";
import type { ComponentType } from "react";

import { SpotlightCard } from "@/components/motion/spotlight-card";
import { copy } from "@/lib/copy";

/**
 * O que vai dentro da página — SPEC 8.1 seção 6.
 *
 * Ocupa o lugar do grid de ocasiões. A diferença é o que o grid argumenta: o
 * antigo dizia "servimos para oito datas", e espalhava o produto; este mostra as
 * peças da página, que é o que a pessoa está comprando.
 *
 * Server Component. O grid antigo era cliente só para trocar `--color-accent` no
 * hover — sem ocasiões não há accent para trocar, e o JavaScript foi junto.
 */

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  counter: Timer,
  gallery: Images,
  letter: BookHeart,
  music: Music,
  timeline: CalendarClock,
  reasons: ListOrdered,
  capsule: Lock,
  map: MapPin,
};

export function BlocksGrid() {
  return (
    <section id="blocos" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.blocks.eyebrow}</p>
        <h2 className="section__title">{copy.blocks.title}</h2>
        <p className="section__lede">{copy.blocks.lede}</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {copy.blocks.items.map((item) => {
          const Icon = ICONS[item.id];

          return (
            <li key={item.id}>
              <SpotlightCard className="block-card h-full">
                <span aria-hidden className="block-card__icon">
                  {Icon ? <Icon size={20} /> : null}
                </span>

                <h3 className="block-card__name">{item.name}</h3>
                <p className="block-card__text">{item.text}</p>
              </SpotlightCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
