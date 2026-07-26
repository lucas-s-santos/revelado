"use client";

import { useMotionValue, useSpring, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, type RefObject } from "react";

import { subscribePointer } from "@/hooks/use-pointer";
import { spring as springPresets } from "@/lib/motion";

/**
 * Botão magnético — SPEC 5.3 e 6.3.
 *
 * Spring (é interação, não revelação — SPEC 6.1 regra 4). Assina o driver de
 * ponteiro só enquanto o ponteiro está dentro do raio de atração, e volta ao
 * centro ao sair.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  options: {
    /** 0..1 — quanto do deslocamento é seguido */
    strength?: number;
    /** raio de atração em px além das bordas do elemento */
    radius?: number;
    spring?: { stiffness: number; damping: number };
    enabled?: boolean;
  } = {},
): {
  ref: RefObject<T | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
} {
  const {
    strength = 0.3,
    radius = 120,
    spring: springConfig = {
      stiffness: springPresets.smooth.stiffness,
      damping: springPresets.smooth.damping,
    },
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  const onPointerLeave = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  const onPointerEnter = useCallback(() => {
    if (!enabled || unsubscribe.current) return;

    const node = ref.current;
    if (!node) return;

    unsubscribe.current = subscribePointer(({ x: px, y: py }) => {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = px - cx;
      const dy = py - cy;

      // Fora do raio, volta ao centro em vez de grudar na última posição.
      const distance = Math.hypot(dx, dy);
      const reach = radius + Math.max(rect.width, rect.height) / 2;
      if (distance > reach) {
        rawX.set(0);
        rawY.set(0);
        return;
      }

      rawX.set(dx * strength);
      rawY.set(dy * strength);
    });
  }, [enabled, radius, strength, rawX, rawY]);

  useEffect(() => onPointerLeave, [onPointerLeave]);

  return { ref, x, y, onPointerEnter, onPointerLeave };
}
