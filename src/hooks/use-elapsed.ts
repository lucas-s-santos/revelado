"use client";

import { useEffect, useState } from "react";

/**
 * Tempo decorrido desde uma data — o contador ao vivo da página publicada
 * (SPEC 6.3 e 8.8) e do mockup do hero.
 *
 * Anos e meses são contados por calendário, não por média de 30 dias: quem está
 * junto desde 12/06/2021 quer ler "4 anos e 1 mês", não "49 meses".
 * Sempre renderizar com `tabular-nums` (SPEC 4.2), senão o dígito pula.
 */

export interface Elapsed {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO: Elapsed = {
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function diff(fromTime: number, toTime: number): Elapsed {
  if (toTime <= fromTime) return ZERO;

  const from = new Date(fromTime);
  const to = new Date(toTime);

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  let hours = to.getHours() - from.getHours();
  let minutes = to.getMinutes() - from.getMinutes();
  let seconds = to.getSeconds() - from.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    // Dias do mês anterior ao da data final.
    const previousMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += previousMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days, hours, minutes, seconds };
}

export function useElapsed(since: Date | string, from?: number): Elapsed {
  const sinceTime =
    typeof since === "string" ? new Date(since).getTime() : since.getTime();

  const [elapsed, setElapsed] = useState<Elapsed>(() =>
    diff(sinceTime, from ?? Date.now()),
  );

  useEffect(() => {
    const tick = () => setElapsed(diff(sinceTime, Date.now()));
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sinceTime]);

  return elapsed;
}
