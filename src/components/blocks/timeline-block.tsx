import { Frame } from "@/components/ui/frame";
import type { PropsOf } from "@/lib/blocks/schema";

/** Linha do tempo — SPEC 7.2. Sem `"use client"`: é lista. */
export function TimelineBlock({
  props,
  mediaSrc,
}: {
  props: PropsOf<"timeline">;
  mediaSrc?: (mediaId: string) => string | undefined;
}) {
  if (props.items.length === 0) {
    // Tela vazia é convite, não recado triste (SPEC 11).
    return (
      <section className="block-timeline is-empty">
        <p className="block-timeline__empty">
          Marque as datas que vocês não querem esquecer.
        </p>
      </section>
    );
  }

  return (
    <section className="block-timeline">
      <ol className="block-timeline__list">
        {props.items.map((item, index) => {
          const src = item.mediaId ? mediaSrc?.(item.mediaId) : undefined;

          return (
            <li key={`${item.date}-${index}`} className="block-timeline__item">
              <span aria-hidden className="block-timeline__dot" />

              <div className="block-timeline__content">
                <p data-numeric className="block-timeline__date">
                  {item.date}
                </p>
                <h3 className="block-timeline__title">{item.title}</h3>
                {item.text ? (
                  <p className="block-timeline__text">{item.text}</p>
                ) : null}

                {src ? (
                  <Frame
                    src={src}
                    alt={item.title}
                    ratio="4/3"
                    sizes="(max-width: 640px) 80vw, 320px"
                    className="mt-3"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
