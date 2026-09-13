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
      {/* O carrossel rola na horizontal por scroll-snap do CSS, sem botões.
          Sem `tabIndex`, quem navega por teclado não consegue chegar nele e as
          fotos depois da primeira ficam inalcançáveis — é a foto da pessoa, na
          tela que é o produto entregue. Com `tabIndex` o contêiner recebe foco e
          as setas rolam, que é o comportamento nativo.

          Sem `role="group"`: ele substitui a semântica de lista do <ul> e deixa
          os <li> órfãos — o axe reprovou na primeira tentativa. `tabIndex`
          sozinho já dá o foco, e o <ul> aceita `aria-label` do jeito que é. */}
      <ul
        className="block-gallery__list"
        {...(props.layout === "carousel"
          ? { tabIndex: 0, "aria-label": "Fotos, role para ver" }
          : {})}
      >
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
