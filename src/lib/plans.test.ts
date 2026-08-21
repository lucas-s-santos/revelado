import { describe, expect, it } from "vitest";

import {
  bestInstallment,
  FOREVER_BUMP_CENTS,
  getPlan,
  MAX_INSTALLMENTS,
  maxInstallments,
  MIN_INSTALLMENT_CENTS,
  orderTotalCents,
  PLANS,
} from "@/lib/plans";

describe("plans", () => {
  it("mantém todo preço em centavos inteiros", () => {
    for (const plan of PLANS) {
      expect(Number.isInteger(plan.priceCents)).toBe(true);
      expect(Number.isInteger(plan.listCents)).toBe(true);
      expect(plan.listCents).toBeGreaterThan(plan.priceCents);
    }
  });

  it("tem exatamente um plano em destaque", () => {
    expect(PLANS.filter((plan) => plan.highlight)).toHaveLength(1);
  });

  it("soma o order bump só em plano com validade", () => {
    const especial = getPlan("especial")!;
    expect(orderTotalCents({ planId: "especial", bumpForever: true })).toBe(
      especial.priceCents + FOREVER_BUMP_CENTS,
    );

    const forever = getPlan("para-sempre")!;
    expect(orderTotalCents({ planId: "para-sempre", bumpForever: true })).toBe(
      forever.priceCents,
    );
  });

  it("aplica cupom antes do bump e nunca fica negativo", () => {
    expect(
      orderTotalCents({
        planId: "especial",
        coupon: { type: "percent", value: 50 },
      }),
    ).toBe(Math.round(getPlan("especial")!.priceCents / 2));

    expect(
      orderTotalCents({
        planId: "simples",
        coupon: { type: "fixed", value: 999_999 },
      }),
    ).toBe(0);
  });
});

/**
 * Parcela é o número mais visível da vitrine — e o que a pessoa confere na
 * fatura. Errar aqui é errar em dinheiro, na frente do cliente.
 */
describe("parcelamento", () => {
  it("respeita o teto de 12x", () => {
    expect(maxInstallments(1_000_00)).toBe(MAX_INSTALLMENTS);
  });

  it("nunca deixa a parcela cair abaixo do piso", () => {
    for (const plan of PLANS) {
      const { count, cents } = bestInstallment(plan.priceCents);
      expect(
        cents,
        `${plan.id}: ${count}x de ${cents} fura o piso`,
      ).toBeGreaterThanOrEqual(MIN_INSTALLMENT_CENTS);
    }
  });

  it("devolve 1x quando o valor não dá nem uma parcela cheia", () => {
    expect(maxInstallments(MIN_INSTALLMENT_CENTS - 1)).toBe(1);
    expect(maxInstallments(0)).toBe(1);
    expect(maxInstallments(-500)).toBe(1);
  });

  it("mantém a parcela em centavos inteiros", () => {
    for (const plan of PLANS) {
      expect(Number.isInteger(bestInstallment(plan.priceCents).cents)).toBe(
        true,
      );
    }
  });

  it("nunca cobra mais que o total ao somar as parcelas", () => {
    // Arredondar para baixo é de propósito: a sobra fica na primeira parcela,
    // e o cliente jamais paga a mais por causa de arredondamento.
    for (let cents = 100; cents <= 20_000; cents += 37) {
      const { count, cents: each } = bestInstallment(cents);
      expect(each * count, `${cents} vira ${count}x de ${each}`).toBeLessThanOrEqual(
        cents,
      );
    }
  });
});
