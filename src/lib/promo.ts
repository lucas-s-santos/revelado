/**
 * Datas comemorativas e o prazo da barra de promoção.
 *
 * SPEC 8.1 pede "contagem regressiva **real**". Contador que reinicia sozinho
 * todo dia é manipulação, não urgência: aqui o prazo é a data da próxima
 * comemoração de verdade, e a barra diz qual é.
 *
 * Datas fixas ficam declaradas; as móveis (Dia das Mães, Dia dos Pais) são
 * calculadas — segundo domingo de maio e de agosto no Brasil.
 */

import type { OccasionId } from "@/lib/occasions";

/** N-ésimo domingo de um mês, em UTC-3 convertido para UTC. */
function nthSunday(year: number, month: number, nth: number): Date {
  // O dia comemorativo começa à meia-noite em São Paulo = 03:00 UTC.
  const first = new Date(Date.UTC(year, month, 1, 3));
  const offset = (7 - first.getUTCDay()) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + (nth - 1) * 7, 3));
}

function fixed(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 3));
}

export interface Celebration {
  occasionId: OccasionId;
  /** rótulo curto para a barra de promoção */
  label: string;
  date: Date;
}

/** Comemorações de um ano, em ordem de calendário. */
export function celebrationsFor(year: number): Celebration[] {
  const celebrations: Celebration[] = [
    {
      occasionId: "namorados",
      label: "Dia dos Namorados",
      date: fixed(year, 5, 12), // 12 de junho
    },
    {
      occasionId: "maes",
      label: "Dia das Mães",
      date: nthSunday(year, 4, 2), // 2º domingo de maio
    },
    {
      occasionId: "pais",
      label: "Dia dos Pais",
      date: nthSunday(year, 7, 2), // 2º domingo de agosto
    },
    {
      occasionId: "natal",
      label: "Natal",
      date: fixed(year, 11, 25),
    },
  ];

  return celebrations.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Próxima comemoração a partir de `from`. Vira o ano quando todas já passaram.
 * Recebe `from` em vez de chamar `new Date()` para o servidor e o cliente
 * renderizarem o mesmo valor.
 */
export function nextCelebration(from: Date): Celebration {
  const time = from.getTime();
  const thisYear = celebrationsFor(from.getUTCFullYear());
  const upcoming = thisYear.find(
    (celebration) => celebration.date.getTime() > time,
  );

  if (upcoming) return upcoming;

  const next = celebrationsFor(from.getUTCFullYear() + 1)[0];
  if (!next) throw new Error("Calendário de comemorações vazio");
  return next;
}

/** Data formatada como "9 de agosto". */
export function formatCelebrationDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
  }).format(date);
}
