/**
 * A data comemorativa do casal e o prazo da barra de promoção.
 *
 * SPEC 8.1 pede "contagem regressiva **real**". Contador que reinicia sozinho
 * todo dia é manipulação, não urgência: aqui o prazo é o próximo Dia dos
 * Namorados de verdade, e a barra diz qual é.
 *
 * Com o produto restrito a casais, sobrou uma data só — e ela é fixa (12 de
 * junho), então não há mais o cálculo de domingo móvel que as datas de mãe e
 * pai exigiam.
 */

export interface Celebration {
  /** rótulo curto para a barra de promoção */
  label: string;
  date: Date;
}

/** 12 de junho à meia-noite em São Paulo = 03:00 UTC. */
export function valentinesDay(year: number): Celebration {
  return {
    label: "Dia dos Namorados",
    date: new Date(Date.UTC(year, 5, 12, 3)),
  };
}

/**
 * Próximo Dia dos Namorados a partir de `from`. Vira o ano quando o deste já
 * passou. Recebe `from` em vez de chamar `new Date()` para o servidor e o
 * cliente renderizarem o mesmo valor — sem número piscando na hidratação.
 */
export function nextCelebration(from: Date): Celebration {
  const thisYear = valentinesDay(from.getUTCFullYear());
  if (thisYear.date.getTime() > from.getTime()) return thisYear;
  return valentinesDay(from.getUTCFullYear() + 1);
}

/** Data formatada como "12 de junho". */
export function formatCelebrationDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
  }).format(date);
}
