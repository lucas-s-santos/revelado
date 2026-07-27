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
  /** escala do mockup, 1 = tamanho real de 390px */
  scale?: number;
  /** permite rolar dentro do mockup */
  interactive?: boolean;
  now?: number;
  mediaSrc?: (mediaId: string) => string | undefined;
  className?: string;
}

export function PhoneFrame({
  content,
  scale = 1,
  interactive = true,
  now,
  mediaSrc,
  className,
}: PhoneFrameProps) {
  return (
    <div
      className={cn("phone-frame", className)}
      style={{ "--phone-scale": scale } as React.CSSProperties}
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
            {...(mediaSrc ? { mediaSrc } : {})}
          />
        </div>
      </div>
    </div>
  );
}
