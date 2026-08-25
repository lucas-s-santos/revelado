import { describe, expect, it } from "vitest";

import {
  bestInstallment,
  durationLabel,
  FOREVER_BUMP_CENTS,
  getPlan,
  MAX_INSTALLMENTS,
  maxInstallments,
  MIN_INSTALLMENT_CENTS,
  orderTotalCents,
  planComparison,
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
    // O 1 Dia expira: "deixar para sempre" tem o que cobrar.
    const dia = getPlan("simples")!;
    expect(orderTotalCents({ planId: "simples", bumpForever: true })).toBe(
      dia.priceCents + FOREVER_BUMP_CENTS,
    );

    // O Eterno já é para sempre: cobrar o bump seria vender duas vezes a
    // mesma coisa.
    const eterno = getPlan("especial")!;
    expect(orderTotalCents({ planId: "especial", bumpForever: true })).toBe(
      eterno.priceCents,
    );
  });

  it("o bump custa exatamente a diferença entre os dois planos", () => {
    // Sem isto, um dos dois caminhos até "para sempre" fica mais barato que o
    // outro — e a pessoa descobre depois, o que soa a pegadinha.
    const dia = getPlan("simples")!;
    const eterno = getPlan("especial")!;

    expect(dia.priceCents + FOREVER_BUMP_CENTS).toBe(eterno.priceCents);
  });

  it("só o Eterno fica no ar sem prazo", () => {
    expect(getPlan("simples")!.durationDays).toBe(1);
    expect(getPlan("especial")!.durationDays).toBeNull();
  });
});

describe("tabela de comparação", () => {
  const linhas = planComparison();
  const acha = (trecho: string) =>
    linhas.find((l) => l.label.toLowerCase().includes(trecho))!;

  it("os números saem dos planos, não de texto solto", () => {
    // É isto que impede a tabela de anunciar "10 fotos" no dia em que o plano
    // passar a dar 15. Toda a copy desta sessão que quebrou, quebrou assim.
    const fotos = acha("fotos na galeria");
    expect(fotos.simples).toContain(String(getPlan("simples")!.maxPhotos));
    expect(fotos.especial).toContain(String(getPlan("especial")!.maxPhotos));
  });

  it("o prazo bate com a duração real de cada plano", () => {
    const tempo = acha("quanto tempo");
    expect(tempo.simples).toBe(durationLabel(getPlan("simples")!));
    expect(tempo.especial).toBe(durationLabel(getPlan("especial")!));
  });

  it("o Eterno nunca tem menos que o 1 Dia", () => {
    // Uma linha marcada só no plano barato seria erro de digitação com cara de
    // regra de negócio.
    for (const linha of linhas) {
      if (linha.simples === true) expect(linha.especial).toBe(true);
    }
  });

  it("há diferença de verdade entre os dois", () => {
    // Tabela em que tudo bate nos dois lados não ajuda ninguém a escolher.
    expect(linhas.some((l) => l.simples === false && l.especial === true)).toBe(
      true,
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
