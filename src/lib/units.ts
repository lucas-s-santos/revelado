/**
 * Rótulos de unidade de tempo — módulo **próprio**, e isso é de propósito.
 *
 * O contador da página publicada precisa só destes rótulos. Enquanto eles
 * moravam dentro de `lib/copy.ts`, o webpack punha o módulo inteiro num chunk
 * compartilhado com a landing e os textos de preço, FAQ e depoimentos iam junto
 * para a página publicada — cujo orçamento é 120 KB (SPEC 10). Tree-shaking de
 * export não resolve isso: a granularidade do chunk é o módulo.
 *
 * `lib/copy.ts` reexporta daqui, então a centralização da SPEC 12 continua de pé.
 */
export const units = {
  years: "anos",
  months: "meses",
  days: "dias",
  hours: "horas",
  minutes: "min",
  seconds: "seg",
  yearsShort: "a",
  monthsShort: "m",
  daysShort: "d",
  hoursShort: "h",
  minutesShort: "min",
  secondsShort: "s",
} as const;
