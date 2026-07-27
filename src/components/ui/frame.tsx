import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Foto com grão + vinheta — SPEC 5.4. O "papel fotográfico" do sistema.
 *
 * **Por que `<img>` e não `next/image`.** A SPEC 6.4 pede `next/image`; a SPEC 10
 * dá 120 KB de JS para a página publicada. O runtime do `next/image` custa
 * 13,7 KB gzip disso — e ele não estava comprando quase nada aqui, porque as
 * fotos do usuário já saem do R2 em 400/800/1600 AVIF/WebP pela fila
 * `media.process` (SPEC 9.2), não pelo otimizador do Next.
 *
 * O que a SPEC pede continua entregue, só que sem JavaScript:
 *  - variantes: `srcSet` + `sizes` montados pelo chamador a partir do R2;
 *  - sem CLS: `aspect-ratio` fixo na moldura;
 *  - placeholder: o blurhash entra como `background-image` em CSS, e não como
 *    troca de estado no cliente;
 *  - `loading="lazy"` e `decoding="async"` nativos do navegador.
 *
 * `next/image` segue valendo onde o orçamento é outro — a logo na landing usa.
 */
export interface FrameProps {
  src?: string;
  /** variantes do R2, ex. "…-400.avif 400w, …-800.avif 800w" */
  srcSet?: string;
  alt?: string;
  /** proporção, ex. "4/5" */
  ratio?: string;
  /** intensidade da vinheta, 0..1 */
  vignette?: number;
  grain?: boolean;
  /** primeira imagem da dobra: carrega cedo e sai da fila de lazy */
  priority?: boolean;
  sizes?: string;
  /** data URI minúsculo do blurhash, mostrado enquanto a foto não chega */
  placeholder?: string;
  className?: string;
  /** conteúdo sobreposto (legenda, badge) */
  children?: ReactNode;
}

export function Frame({
  src,
  srcSet,
  alt = "",
  ratio = "4/5",
  vignette = 0.55,
  grain = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 400px",
  placeholder,
  className,
  children,
}: FrameProps) {
  return (
    <figure
      className={cn("frame", className)}
      style={
        {
          aspectRatio: ratio,
          "--vignette": vignette,
          ...(placeholder
            ? { backgroundImage: `url("${placeholder}")` }
            : undefined),
        } as React.CSSProperties
      }
    >
      {src ? (
        // Decisão consciente: o runtime do next/image custa 13,7 KB gzip e
        // estourava o orçamento de 120 KB da página publicada (SPEC 10). As
        // variantes AVIF/WebP vêm do R2 pela fila media.process, não do
        // otimizador do Next. Ver o bloco de comentário no topo deste arquivo.
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          {...(srcSet ? { srcSet } : {})}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          className="frame__img"
        />
      ) : (
        <div aria-hidden className="frame__empty" />
      )}

      <span aria-hidden className="frame__vignette" />
      {grain ? <span aria-hidden className="frame__grain bg-noise" /> : null}

      {children ? (
        <figcaption className="frame__cap">{children}</figcaption>
      ) : null}
    </figure>
  );
}
