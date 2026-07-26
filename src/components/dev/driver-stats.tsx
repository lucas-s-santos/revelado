"use client";

import { useEffect, useState } from "react";

import { getPointerDriverStats } from "@/hooks/use-pointer";
import { getScrollDriverStats } from "@/hooks/use-scroll-driver";

/**
 * Painel de aceite da Fase 1: mostra que N componentes compartilham **um**
 * listener de scroll e **um** de pointer (SPEC 6.4).
 *
 * A prova definitiva continua sendo o DevTools:
 *   getEventListeners(window).scroll        → 1
 *   getEventListeners(window).pointermove   → 1
 */
export function DriverStats() {
  const [stats, setStats] = useState({
    scroll: { subscribers: 0, listeners: 0 },
    pointer: { subscribers: 0, listeners: 0 },
  });

  useEffect(() => {
    const id = setInterval(() => {
      setStats({
        scroll: getScrollDriverStats(),
        pointer: getPointerDriverStats(),
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="glass fixed right-4 bottom-4 z-50 hidden w-56 p-4 text-xs md:block">
      <p className="eyebrow mb-3">Drivers</p>

      <dl className="flex flex-col gap-2">
        <Row
          label="scroll"
          listeners={stats.scroll.listeners}
          subscribers={stats.scroll.subscribers}
        />
        <Row
          label="pointermove"
          listeners={stats.pointer.listeners}
          subscribers={stats.pointer.subscribers}
        />
      </dl>

      <p className="mt-3 text-[rgb(var(--color-muted))]">
        Confirme no console: <code>getEventListeners(window)</code>
      </p>
    </aside>
  );
}

function Row({
  label,
  listeners,
  subscribers,
}: {
  label: string;
  listeners: number;
  subscribers: number;
}) {
  const ok = listeners <= 1;

  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="font-mono">{label}</dt>
      <dd
        data-numeric
        className={
          ok
            ? "text-[rgb(var(--color-cyan))]"
            : "text-[rgb(var(--color-danger))]"
        }
      >
        {listeners} listener · {subscribers} assin.
      </dd>
    </div>
  );
}
