"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useMagnetic } from "@/hooks/use-magnetic";
import { useCoarsePointer, useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Envelope magnético — SPEC 5.3. Usado nos CTAs principais (SPEC 6.3).
 * Desligado em ponteiro grosso e em prefers-reduced-motion.
 */
export interface MagneticProps {
  /** 0..1, default .3 */
  strength?: number;
  /** px, default 120 */
  radius?: number;
  spring?: { stiffness: number; damping: number };
  className?: string;
  children: ReactNode;
}

export function Magnetic({
  strength = 0.3,
  radius = 120,
  spring,
  className,
  children,
}: MagneticProps) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const enabled = !reduced && !coarse;

  const { ref, x, y, onPointerEnter, onPointerLeave } =
    useMagnetic<HTMLSpanElement>({
      strength,
      radius,
      ...(spring ? { spring } : {}),
      enabled,
    });

  return (
    <motion.span
      ref={ref}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={enabled ? { x, y } : undefined}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}
