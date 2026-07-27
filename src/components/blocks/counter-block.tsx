"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { useElapsed } from "@/hooks/use-elapsed";
import type { CounterUnit, PropsOf } from "@/lib/blocks/schema";
// Módulo só dos rótulos: importar de `lib/copy` traria os textos da landing
// para o bundle da página publicada (SPEC 10).
import { units as unitLabels } from "@/lib/units";

/**
 * Contador ao vivo — SPEC 6.3, 7.2 e 8.8.
 *
 * Client de verdade: precisa do tique de 1s. `tabular-nums` obrigatório, senão o
 * dígito pula a cada segundo e a página "tremula" (SPEC 4.2).
 *
 * O `now` vem de fora para o primeiro valor bater com o HTML do servidor: sem
 * isso o número pisca na hidratação e conta como CLS (SPEC 10).
 */
export function CounterBlock({
  props,
  now,
}: {
  props: PropsOf<"counter">;
  now?: number;
}) {
  const elapsed = useElapsed(props.date, now);
  const countdown = useCountdown(props.date, now);

  const values: Record<CounterUnit, number> =
    props.mode === "since"
      ? {
          y: elapsed.years,
          mo: elapsed.months,
          d: elapsed.days,
          h: elapsed.hours,
          m: elapsed.minutes,
          s: elapsed.seconds,
        }
      : {
          y: 0,
          mo: 0,
          d: countdown.days,
          h: countdown.hours,
          m: countdown.minutes,
          s: countdown.seconds,
        };

  const labels: Record<CounterUnit, string> = {
    y: unitLabels.years,
    mo: unitLabels.months,
    d: unitLabels.days,
    h: unitLabels.hours,
    m: unitLabels.minutes,
    s: unitLabels.seconds,
  };

  return (
    <section className="block-counter">
      <p className="eyebrow">{props.label}</p>

      <dl className="block-counter__grid">
        {props.units.map((unit) => (
          <div key={unit} className="block-counter__cell">
            <dd data-numeric className="block-counter__value">
              {String(values[unit]).padStart(2, "0")}
            </dd>
            <dt className="block-counter__unit">{labels[unit]}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
