"use client";

import { useEffect, useState } from "react";

/**
 * Contagem regressiva até uma data — barra de promoção e CTA final (SPEC 8.1).
 *
 * `setInterval` de 1s. O primeiro valor é calculado a partir de `now` recebido
 * de fora, para o HTML do servidor e a primeira pintura do cliente baterem: sem
 * isso o número pisca na hidratação (SPEC 8.1: sem CLS).
 */

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** true quando a data já passou */
  done: boolean;
}

function split(remaining: number): Countdown {
  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }

  const total = Math.floor(remaining / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: false,
  };
}

export function useCountdown(target: Date | string, from?: number): Countdown {
  const targetTime =
    typeof target === "string" ? new Date(target).getTime() : target.getTime();

  const [countdown, setCountdown] = useState<Countdown>(() =>
    split(targetTime - (from ?? Date.now())),
  );

  useEffect(() => {
    const tick = () => setCountdown(split(targetTime - Date.now()));
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return countdown;
}
