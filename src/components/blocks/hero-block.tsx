import { Frame } from "@/components/ui/frame";
import type { PropsOf } from "@/lib/blocks/schema";
import { cn } from "@/lib/utils";

/**
 * Bloco hero da página publicada — SPEC 7.2.
 *
 * **Sem `"use client"` de propósito.** Este módulo não tem estado nem efeito,
 * então roda como Server Component em `/p/[slug]` (zero JS no orçamento) e é
 * compilado como client quando o preview do editor o importa. É o que permite
 * o mesmo componente nos dois lugares sem duplicação (SPEC 12 anti-padrão 2).
 */
export function HeroBlock({
  props,
  media,
  mode = "published",
}: {
  props: PropsOf<"hero">;
  /**
   * Na página publicada este título **é** o título do documento, então é `h1`.
   * Num preview ele não é: o preview é a figura de uma página dentro de outra,
   * que já tem o `h1` dela.
   *
   * A tela de escolha de template mostra sete previews de uma vez — sem isto a
   * página nascia com oito `h1`, e quem navega por cabeçalho ouvia "Para você"
   * sete vezes antes de chegar em qualquer coisa útil. O axe não reprova
   * cabeçalho repetido; continua sendo errado.
   */
  mode?: "preview" | "published";
  /**
   * Mapa `mediaId → URL`. Mapa e não função: o renderer atravessa a fronteira
   * server→client e função não é serializável (ver lib/media.ts).
   */
  media?: Record<string, string>;
}) {
  const src = props.mediaId ? media?.[props.mediaId] : undefined;
  const Titulo = mode === "published" ? "h1" : "p";

  return (
    <section
      className={cn("block-hero", props.align === "left" && "is-left")}
      style={{ "--overlay": props.overlay } as React.CSSProperties}
    >
      <div className="block-hero__media">
        <Frame
          {...(src ? { src } : {})}
          alt={props.title}
          ratio="3/4"
          vignette={0.45}
          priority
          sizes="(max-width: 640px) 100vw, 640px"
        />
        <span aria-hidden className="block-hero__overlay" />
      </div>

      <div className="block-hero__text">
        <Titulo className="block-hero__title">{props.title}</Titulo>
        {props.subtitle ? (
          <p className="block-hero__subtitle">{props.subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
