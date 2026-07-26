"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Revelação por entrada na viewport — SPEC 6.4: "toda animação de entrada usa
 * once: true. Nada re-anima ao rolar de volta."
 *
 * IntersectionObserver, não scroll: é o observer que existe exatamente para
 * isso e não custa frame.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: {
    once?: boolean;
    /** fração visível para disparar, 0..1 */
    amount?: number;
    /** margem do root, ex. "0px 0px -10% 0px" para adiantar */
    margin?: string;
    enabled?: boolean;
  } = {},
): { ref: RefObject<T | null>; visible: boolean } {
  const {
    once = true,
    amount = 0.2,
    margin = "0px 0px -10% 0px",
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!enabled) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: amount, rootMargin: margin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, amount, margin, enabled]);

  return { ref, visible };
}
