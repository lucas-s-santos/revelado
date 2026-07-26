import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Foto com grão + vinheta — SPEC 5.4. O "papel fotográfico" do sistema.
 * Server Component: é só estrutura e CSS, nada de interação.
 */
export interface FrameProps {
  src?: string;
  alt?: string;
  /** proporção, ex. "4/5" */
  ratio?: string;
  /** intensidade da vinheta, 0..1 */
  vignette?: number;
  grain?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** conteúdo sobreposto (legenda, badge) */
  children?: ReactNode;
}

export function Frame({
  src,
  alt = "",
  ratio = "4/5",
  vignette = 0.55,
  grain = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 400px",
  className,
  children,
}: FrameProps) {
  return (
    <figure
      className={cn("frame", className)}
      style={
        { aspectRatio: ratio, "--vignette": vignette } as React.CSSProperties
      }
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
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
