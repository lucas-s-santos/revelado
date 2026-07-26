/**
 * Planos — SPEC 7.1 (model Plan) + 8.5 (checkout).
 * SPEC 12: valores monetários em centavos, inteiros. Nunca float.
 * durationDays null = vitalício.
 */

export const PLAN_IDS = ["simples", "especial", "para-sempre"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanSeed {
  id: PlanId;
  name: string;
  priceCents: number;
  /** Preço "de", riscado na vitrine. */
  listCents: number;
  durationDays: number | null;
  maxPhotos: number;
  /** Plano destacado no meio da grade de preços (SPEC 8.1 seção 8). */
  highlight: boolean;
  features: string[];
}

export const PLANS: readonly PlanSeed[] = [
  {
    id: "simples",
    name: "Simples",
    priceCents: 1990,
    listCents: 3990,
    durationDays: 365,
    maxPhotos: 5,
    highlight: false,
    features: [
      "1 ano no ar",
      "Até 5 fotos",
      "Contador ao vivo",
      "Link + QR Code em PNG",
    ],
  },
  {
    id: "especial",
    name: "Especial",
    priceCents: 3490,
    listCents: 6990,
    durationDays: 365,
    maxPhotos: 30,
    highlight: true,
    features: [
      "1 ano no ar",
      "Até 30 fotos",
      "Música do Spotify ou YouTube",
      "Linha do tempo e carta",
      "QR Code em PNG, SVG e cartão A6 em PDF",
      "Senha na página",
    ],
  },
  {
    id: "para-sempre",
    name: "Para sempre",
    priceCents: 5990,
    listCents: 9990,
    durationDays: null,
    maxPhotos: 60,
    highlight: false,
    features: [
      "No ar para sempre",
      "Até 60 fotos",
      "Todos os blocos",
      "Mural de recados",
      "Cartão A6 em PDF e aviso de primeira visita",
    ],
  },
] as const;

/** Order bump do checkout: "deixar para sempre, +R$ 9" (SPEC 8.5). */
export const FOREVER_BUMP_CENTS = 900;

export const PLAN_BY_ID = new Map<string, PlanSeed>(
  PLANS.map((plan) => [plan.id, plan]),
);

export function getPlan(id: string): PlanSeed | undefined {
  return PLAN_BY_ID.get(id);
}

/** Total do pedido em centavos. Cupom aplicado antes do bump. */
export function orderTotalCents(input: {
  planId: PlanId;
  bumpForever?: boolean;
  coupon?: { type: "percent" | "fixed"; value: number } | undefined;
}): number {
  const plan = PLAN_BY_ID.get(input.planId);
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
