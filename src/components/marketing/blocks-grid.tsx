import { CalendarClock, ListOrdered, Lock, MapPin, Play } from "lucide-react";
import type { ComponentType } from "react";

import { copy } from "@/lib/copy";

/**
 * O que vai dentro da página — SPEC 8.1 seção 6.
 *
 * Antes eram oito cards do mesmo tamanho e da mesma cor, o que dava a todos o
 * mesmo peso e não vendia nenhum. Agora são quatro em destaque, cada um no seu
 * tom e com uma prévia do que a peça faz, e os outros quatro numa linha
 * compacta — o produto continua com oito blocos.
 *
 * As prévias são forma em CSS, não imagem: nenhuma delas custa requisição, e
 * todas acompanham a paleta sozinhas. Os quatro tons saem dos tokens
 * `--color-card-*`, que já passaram pelo `pnpm contrast` com a tinta por cima.
 *
 * Server Component: não há estado nem evento aqui.
 */

const MORE_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  timeline: CalendarClock,
  reasons: ListOrdered,
  capsule: Lock,
  map: MapPin,
};

/** A prévia de cada card. Uma função por peça, para o markup não virar sopa. */
function Preview({ id, digits, quote }: { id: string; digits?: readonly { value: string; label: string }[]; quote?: string }) {
  if (id === "counter" && digits) {
    return (
      <div aria-hidden className="tone-card__preview tone-card__counter">
        {digits.map((d) => (
          <span key={d.label} className="tone-card__digit">
            <strong>{d.value}</strong>
            <small>{d.label}</small>
          </span>
        ))}
      </div>
    );
  }

  if (id === "gallery") {
    return (
      <div aria-hidden className="tone-card__preview tone-card__gallery">
        <span /><span /><span />
      </div>
    );
  }

  if (id === "music") {
    return (
      <div aria-hidden className="tone-card__preview tone-card__music">
        <span className="tone-card__play">
          <Play size={14} />
        </span>
        <span className="tone-card__wave">
          {[38, 70, 46, 92, 58, 78, 34].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </span>
      </div>
    );
  }

  if (id === "letter" && quote) {
    return (
      <div aria-hidden className="tone-card__preview tone-card__letter">
        <p>{quote}</p>
      </div>
    );
  }

  return null;
}

export function BlocksGrid() {
  return (
    <section id="blocos" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.blocks.eyebrow}</p>
        <h2 className="section__title">{copy.blocks.title}</h2>
        <p className="section__lede">{copy.blocks.lede}</p>
      </header>

      <ul className="tone-grid">
        {copy.blocks.featured.map((item) => (
          <li key={item.id} className={`tone-card tone-card--${item.tone}`}>
            {/* Cada peça traz só os dados da sua própria prévia, então o
                array é uma união de formatos. `in` estreita sem `any`. */}
            <Preview
              id={item.id}
              digits={"digits" in item ? item.digits : undefined}
              quote={"quote" in item ? item.quote : undefined}
            />

            <div className="tone-card__body">
              <h3 className="tone-card__name">{item.name}</h3>
              <p className="tone-card__text">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="blocks-more">
        <p className="blocks-more__label">{copy.blocks.moreLabel}</p>

        <ul className="blocks-more__list">
          {copy.blocks.more.map((item) => {
            const Icon = MORE_ICONS[item.id];

            return (
              <li key={item.id}>
                <span aria-hidden className="blocks-more__icon">
                  {Icon ? <Icon size={15} /> : null}
                </span>
                {item.name}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
