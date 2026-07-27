import { BlockRenderer } from "@/components/blocks/block-renderer";
import type { SiteContent } from "@/lib/blocks/schema";
import { cn } from "@/lib/utils";

/**
 * Mockup de celular que renderiza o `BlockRenderer` com o JSON ao vivo —
 * SPEC 5.3 e 8.4.
 *
 * Sem `"use client"`: quem monta o editor (Fase 4) já é client e arrasta este
 * módulo junto. Aqui é só a moldura — o conteúdo vem do mesmo renderer da
 * página publicada, que é o ponto (SPEC 12 anti-padrão 2).
 */
export interface PhoneFrameProps {
  content: SiteContent;
  /**
   * Escala do mockup, 1 = tamanho real de 390px.
   *
   * Sem valor, **não escreve nada inline** — quem manda é o CSS. No editor a
   * escala muda por breakpoint (0.42 no celular, 0.78 no desktop) e um estilo
   * inline aqui venceria a media query, deixando o mockup estourado na tela
   * pequena.
   */
  scale?: number;
  /** permite rolar dentro do mockup */
  interactive?: boolean;
  now?: number;
  media?: Record<string, string>;
  className?: string;
}

export function PhoneFrame({
  content,
  scale,
  interactive = true,
  now,
  media,
  className,
}: PhoneFrameProps) {
  return (
    <div
      className={cn("phone-frame", className)}
      style={
        scale !== undefined
          ? ({ "--phone-scale": scale } as React.CSSProperties)
          : undefined
      }
    >
      <div className="phone-frame__device">
        <span aria-hidden className="phone-frame__notch" />

        <div
          className="phone-frame__screen"
          data-interactive={interactive ? "" : undefined}
        >
          <BlockRenderer
            content={content}
            mode="preview"
            {...(now !== undefined ? { now } : {})}
            {...(media ? { media } : {})}
          />
        </div>
      </div>
    </div>
  );
}
