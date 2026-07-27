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
  mediaSrc,
}: {
  props: PropsOf<"hero">;
  /**
   * Resolve `mediaId` → URL. Mesma assinatura em todos os blocos: o
   * `BlockRenderer` passa uma função, não uma string já resolvida — só o bloco
   * sabe qual dos seus ids precisa virar URL.
   */
  mediaSrc?: (mediaId: string) => string | undefined;
}) {
  const src = props.mediaId ? mediaSrc?.(props.mediaId) : undefined;

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
        <h1 className="block-hero__title">{props.title}</h1>
        {props.subtitle ? (
          <p className="block-hero__subtitle">{props.subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
