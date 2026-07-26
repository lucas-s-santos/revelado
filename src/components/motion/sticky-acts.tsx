"use client";

import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSectionProgress } from "@/hooks/use-section-progress";
import { cn } from "@/lib/utils";

/**
 * "Como funciona" em três atos sticky com trilho preenchendo — SPEC 6.3 e 8.1.
 *
 * O progresso vira `--p` no contêiner e o resto é CSS: o trilho usa scaleY(--p)
 * e cada ato acende quando `--p` cruza a faixa dele. Zero JS por frame.
 */
export interface Act {
  eyebrow: string;
  title: string;
  text: string;
}

export function StickyActs({
  acts,
  className,
}: {
  acts: Act[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useSectionProgress(ref, { enabled: !reduced });

  return (
    <div ref={ref} className={cn("sticky-acts", className)}>
      <div className="sticky-acts__rail" aria-hidden>
        <span className="sticky-acts__rail-fill" />
      </div>

      <ol className="sticky-acts__list">
        {acts.map((act, index) => (
          <li
            key={act.title}
            className="sticky-acts__act"
            style={
              {
                "--from": (index / acts.length).toFixed(3),
                "--to": ((index + 1) / acts.length).toFixed(3),
              } as React.CSSProperties
            }
          >
            <p className="eyebrow">{act.eyebrow}</p>
            <h3 className="sticky-acts__title">{act.title}</h3>
            <p className="text-[rgb(var(--color-muted))]">{act.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
