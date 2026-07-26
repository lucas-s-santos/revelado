import { describe, expect, it } from "vitest";

import {
  FOREVER_BUMP_CENTS,
  getPlan,
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
