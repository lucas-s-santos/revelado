"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useReveal } from "@/hooks/use-reveal";
import { duration, ease, STAGGER } from "@/lib/motion";

/**
 * Revelação por scroll — SPEC 5.3 e 6.3. Easing, não spring: é entrada, não
 * interação. `once: true` sempre que possível — nada re-anima ao rolar de volta.
 */
export interface RevealProps {
  /** deslocamento inicial em px, default 22 */
  y?: number;
  delay?: number;
  /** índice na lista, para o stagger de 60ms da SPEC 6.3 */
  index?: number;
  once?: boolean;
  className?: string;
  children: ReactNode;
}

export function Reveal({
  y = 22,
  delay = 0,
  index = 0,
  once = true,
  className,
  children,
}: RevealProps) {
  const reduced = useReducedMotion();
  const { ref, visible } = useReveal<HTMLDivElement>({
    once,
    enabled: !reduced,
  });

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: duration.slow,
        ease: ease.out,
        delay: delay + index * STAGGER,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
