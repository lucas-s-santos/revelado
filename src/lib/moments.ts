/**
 * Momentos do casal.
 *
 * Não são ocasiões: não ramificam o produto, não trocam a paleta e não mudam os
 * blocos. A página é sempre a mesma — de um para o outro. Isto aqui é a lista
 * de motivos pelos quais alguém monta uma, e serve a dois lugares:
 *
 *  - a faixa da landing, que mostra que serve para qualquer data de vocês;
 *  - o passo da data no editor, onde vira sugestão de rótulo do contador.
 *
 * Se um dia isso virar seletor de conteúdo, é sinal de que voltamos ao modelo
 * de ocasiões — que foi justamente o que saiu.
 */

export interface Moment {
  id: string;
  /** rótulo na faixa da landing */
  label: string;
  /** o que o contador diz quando a pessoa escolhe este momento */
  counterLabel: string;
  /** o contador conta desde a data ou até ela? */
  mode: "since" | "until";
}

export const MOMENTS: readonly Moment[] = [
  {
    id: "namoro",
    label: "Aniversário de namoro",
    counterLabel: "juntos há",
    mode: "since",
  },
  {
    id: "primeiro-mes",
    label: "Primeiro mês",
    counterLabel: "juntos há",
    mode: "since",
  },
  {
    id: "pedido",
    label: "Pedido de namoro",
    counterLabel: "faltam",
    mode: "until",
  },
  { id: "noivado", label: "Noivado", counterLabel: "faltam", mode: "until" },
  {
    id: "casamento",
    label: "Bodas",
    counterLabel: "casados há",
    mode: "since",
  },
  {
    id: "distancia",
    label: "Namoro à distância",
    counterLabel: "até te ver de novo",
    mode: "until",
  },
  {
    id: "reconciliacao",
    label: "Segunda chance",
    counterLabel: "de novo, desde",
    mode: "since",
  },
  {
    id: "sem-motivo",
    label: "Sem motivo nenhum",
    counterLabel: "juntos há",
    mode: "since",
  },
] as const;
