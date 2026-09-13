"use client";

import type { ElementType, ReactNode } from "react";

import { useSpotlight } from "@/hooks/use-spotlight";
import { useCoarsePointer, useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Card de vidro com anel de borda iluminado seguindo o ponteiro — SPEC 5.3.
 * Escreve --sx/--sy no próprio nó, sem re-render do React.
 */
export interface SpotlightCardProps {
  /** RGB "224 80 143". Default: o `--color-accent` que estiver valendo. */
  accent?: string;
  /** raio do halo em px */
  radius?: number;
  /** translateY(-3px) no hover */
  lift?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function SpotlightCard({
  accent,
  radius = 240,
  lift = true,
  as: Tag = "div",
  className,
  children,
}: SpotlightCardProps) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const { ref, onPointerEnter, onPointerLeave } = useSpotlight<HTMLDivElement>(
    !reduced && !coarse,
  );

  return (
    <Tag
      ref={ref}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-lift={lift ? "" : undefined}
      className={cn("spotlight-card glass", className)}
      style={
        {
          "--spot-accent": accent ?? "var(--color-accent)",
          "--spot-radius": `${radius}px`,
        } as React.CSSProperties
      }
    >
      {/* Puramente decorativo: fora da árvore de acessibilidade (SPEC 11). */}
      <span aria-hidden className="spotlight-card__halo" />
      <span aria-hidden className="spotlight-card__ring" />
      <div className="relative">{children}</div>
    </Tag>
  );
}
