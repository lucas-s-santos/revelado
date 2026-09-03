/**
 * Planos — SPEC 7.1 (model Plan) + 8.5 (checkout).
 * SPEC 12: valores monetários em centavos, inteiros. Nunca float.
 * durationDays null = vitalício.
 */

/**
 * IDS ANTIGOS, NOMES NOVOS — e é de propósito.
 *
 * `Order.planId` referencia `Plan.id` no banco. Trocar os ids obrigaria a
 * migrar todo pedido já gravado, e um pedido órfão é dinheiro sem origem
 * rastreável. Então "simples" virou o 1 Dia e "especial" virou o Eterno,
 * mantendo a chave. O que a pessoa lê é `name`; o id nunca aparece na tela.
 *
 * "para-sempre" saiu da vitrine. A linha dele CONTINUA no banco — o seed usa
 * upsert e não apaga —, então quem comprou antes continua com a página no ar.
 */
export const PLAN_IDS = ["simples", "especial"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanSeed {
  id: PlanId;
  name: string;
  /** uma linha, para o card da vitrine */
  hint: string;
  priceCents: number;
  /** Preço "de", riscado na vitrine. */
  listCents: number;
  durationDays: number | null;
  maxPhotos: number;
  /** Plano destacado no meio da grade de preços (SPEC 8.1 seção 8). */
  highlight: boolean;
  features: string[];
  /** o que este plano NÃO tem — riscado no card, para a diferença ficar clara */
  missing?: string[];
}

export const PLANS: readonly PlanSeed[] = [
  {
    id: "simples",
    name: "1 Dia",
    hint: "para entregar hoje",
    priceCents: 1990,
    listCents: 3990,
    // 24 horas no ar. É o produto de impulso: barato, imediato e sem
    // compromisso — quem quiser guardar sobe para o Eterno.
    durationDays: 1,
    maxPhotos: 10,
    highlight: false,
    features: [
      "1 página no ar por 24 horas",
      "Até 10 fotos",
      "Contador ao vivo",
      "Música do Spotify ou YouTube",
      "Link + QR Code em PNG",
    ],
    missing: ["Fica no ar para sempre", "Linha do tempo e quiz"],
  },
  {
    id: "especial",
    name: "Eterno",
    hint: "para não acabar nunca",
    priceCents: 3490,
    listCents: 6990,
    durationDays: null,
    // O schema limita a galeria em 60 (blocks/schema.ts). Prometer "ilimitado"
    // seria alegar o que o sistema recusa na hora de salvar.
    maxPhotos: 60,
    highlight: true,
    features: [
      "1 página no ar para sempre",
      "Até 60 fotos",
      "Contador ao vivo",
      "Música do Spotify ou YouTube",
      "Linha do tempo e quiz do casal",
      "Carta em envelope",
      "QR Code em PNG, SVG e cartão A6 em PDF",
      "Senha na página",
    ],
  },
] as const;

/**
 * A tabela de comparação entre os dois planos.
 *
 * Ocupa o lugar do "nós contra as outras plataformas" que esse tipo de página
 * costuma ter. A troca é deliberada: afirmar o que um concorrente não faz
 * exige verificar o produto dele, e ninguém verifica — então vira alegação
 * solta. A dúvida real de quem está nessa altura da página é outra, e é esta:
 * qual dos dois eu levo.
 *
 * As linhas com número saem de `PLANS` (ver o teste que amarra as duas): assim
 * a tabela não pode dizer "10 fotos" no dia em que o plano passar a dar 15.
 */
export interface ComparisonRow {
  label: string;
  simples: boolean | string;
  especial: boolean | string;
}

export function planComparison(
  plans: readonly PlanSeed[] = PLANS,
): readonly ComparisonRow[] {
  const byId = new Map(plans.map((plan) => [plan.id, plan]));
  const dia = byId.get("simples") ?? PLAN_BY_ID.get("simples")!;
  const eterno = byId.get("especial") ?? PLAN_BY_ID.get("especial")!;

  return [
    {
      label: "Quanto tempo fica no ar",
      simples: durationLabel(dia),
      especial: durationLabel(eterno),
    },
    {
      label: "Fotos na galeria",
      simples: `até ${dia.maxPhotos}`,
      especial: `até ${eterno.maxPhotos}`,
    },
    { label: "Contador ao vivo", simples: true, especial: true },
    { label: "Música do Spotify ou YouTube", simples: true, especial: true },
    { label: "Preview completo antes de pagar", simples: true, especial: true },
    { label: "Pagamento único, sem mensalidade", simples: true, especial: true },
    { label: "Link e QR Code para imprimir", simples: true, especial: true },
    { label: "Carta em envelope", simples: false, especial: true },
    { label: "Linha do tempo", simples: false, especial: true },
    { label: "Quiz do casal", simples: false, especial: true },
    { label: "Senha na página", simples: false, especial: true },
    { label: "QR em SVG e cartão A6 em PDF", simples: false, especial: true },
  ];
}

/**
 * O rótulo de prazo, tirado da duração real.
 *
 * Existia uma string fixa na copy dizendo "por 1 ano no ar" para qualquer
 * plano com prazo. No dia em que o prazo virou 24 horas, a vitrine passou a
 * anunciar um ano e a cobrança a entregar um dia — o tipo de divergência que
 * ninguém nota até virar reclamação.
 */
export function durationLabel(plan: PlanSeed): string {
  if (plan.durationDays === null) return "fica para sempre";
  if (plan.durationDays === 1) return "24 horas no ar";
  return `${plan.durationDays} dias no ar`;
}

/**
 * Order bump: "deixar para sempre" a partir do 1 Dia (SPEC 8.5).
 *
 * Vale exatamente a diferença entre os dois planos (3490 − 1990). Assim subir
 * pelo bump e comprar o Eterno direto custam o mesmo — sem caminho esperto que
 * saia mais barato que o outro, que é o tipo de coisa que a pessoa descobre
 * depois e sente como pegadinha.
 */
export const FOREVER_BUMP_CENTS = 1500;

/**
 * Parcelamento no cartão — SPEC 8.5.
 *
 * Teto de 12x, com piso por parcela: 12x de R$ 2,91 não existe na maquininha,
 * e prometer na vitrine o que o Mercado Pago recusa no checkout é o pior jeito
 * de perder a venda. O piso de R$ 3 é o que faz o número da tela ser o mesmo
 * que a pessoa vai ver lá.
 *
 * Sem juros: o valor da parcela é o total dividido, e é a gente que absorve a
 * taxa do provedor. Se um dia passar a repassar, o cálculo muda **aqui** e a
 * tela acompanha sozinha.
 */
export const MAX_INSTALLMENTS = 12;
export const MIN_INSTALLMENT_CENTS = 300;

export function maxInstallments(totalCents: number): number {
  if (totalCents <= 0) return 1;
  const byFloor = Math.floor(totalCents / MIN_INSTALLMENT_CENTS);
  return Math.max(1, Math.min(MAX_INSTALLMENTS, byFloor));
}

export interface Installment {
  count: number;
  /** centavos por parcela, arredondado para baixo */
  cents: number;
}

/**
 * A maior parcela possível — é o que vai no "ou 11x de R$ 3,17".
 *
 * Arredonda para baixo e deixa o resto na primeira parcela, que é como as
 * maquininhas fazem: assim a soma fecha exatamente com o total, sem centavo
 * sobrando nem faltando.
 */
export function bestInstallment(totalCents: number): Installment {
  const count = maxInstallments(totalCents);
  return { count, cents: Math.floor(totalCents / count) };
}

export const PLAN_BY_ID = new Map<string, PlanSeed>(
  PLANS.map((plan) => [plan.id, plan]),
);

export function getPlan(id: string): PlanSeed | undefined {
  return PLAN_BY_ID.get(id);
}

/**
 * Total do pedido em centavos. Cupom aplicado antes do bump.
 *
 * `plan` é opcional: quem já resolveu o plano no banco (checkout com preço
 * editável pelo admin — SPEC 8.9) passa o objeto e esta função nunca olha
 * para o array estático. Quem não passa cai nos cinco de fábrica — é o caso
 * de toda tela que só exibe, nunca cobra.
 */
export function orderTotalCents(input: {
  planId: PlanId;
  bumpForever?: boolean;
  coupon?: { type: "percent" | "fixed"; value: number } | undefined;
  plan?: PlanSeed;
}): number {
  const plan = input.plan ?? PLAN_BY_ID.get(input.planId);
  if (!plan) throw new Error(`Plano desconhecido: ${input.planId}`);

  let total = plan.priceCents;

  if (input.coupon) {
    total =
      input.coupon.type === "percent"
        ? Math.round(total * (1 - input.coupon.value / 100))
        : total - input.coupon.value;
  }

  if (input.bumpForever && plan.durationDays !== null) {
    total += FOREVER_BUMP_CENTS;
  }

  return Math.max(total, 0);
}
