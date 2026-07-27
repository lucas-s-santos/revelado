import { Frame } from "@/components/ui/frame";
import type { PropsOf } from "@/lib/blocks/schema";
import { cn } from "@/lib/utils";

/**
 * Galeria — SPEC 7.2. Quatro layouts: carousel, grid, polaroid, stack.
 *
 * Sem `"use client"`: o carrossel é `scroll-snap` do CSS, não JavaScript. Rola
 * com o dedo no celular e com a barra no desktop, funciona sem hidratar e não
 * pesa no orçamento da página publicada (SPEC 10).
 */
export function GalleryBlock({
  props,
  media,
}: {
  props: PropsOf<"gallery">;
  /** mapa mediaId → URL. Sem entrada, mostra moldura vazia. */
  media?: Record<string, string>;
}) {
  const items = props.mediaIds.length > 0 ? props.mediaIds : [];

  // Rascunho sem foto ainda: três molduras vazias, para a página ter forma.
  const slots = items.length > 0 ? items : ["", "", ""];

  return (
    <section className={cn("block-gallery", `is-${props.layout}`)}>
      <ul className="block-gallery__list">
        {slots.map((mediaId, index) => {
          const src = mediaId ? media?.[mediaId] : undefined;
          const caption = mediaId ? props.captions?.[mediaId] : undefined;

          return (
            <li
              key={mediaId || `vazio-${index}`}
              className="block-gallery__item"
            >
              <Frame
                {...(src ? { src } : {})}
                alt={caption ?? ""}
                ratio={props.layout === "polaroid" ? "1/1" : "4/5"}
                sizes="(max-width: 640px) 80vw, 320px"
              >
                {caption ? <span>{caption}</span> : null}
              </Frame>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
