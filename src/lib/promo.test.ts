import { describe, expect, it } from "vitest";

import {
  formatCelebrationDate,
  nextCelebration,
  valentinesDay,
} from "@/lib/promo";

/**
 * A barra de promoção mostra essa data para todo visitante — errar aqui é errar
 * em público.
 *
 * Com o produto restrito a casais sobrou uma data só, e ela é fixa: 12 de
 * junho. Os testes das datas móveis (Mães e Pais) saíram junto com elas.
 */
describe("promo", () => {
  it("fixa o Dia dos Namorados em 12 de junho", () => {
    expect(formatCelebrationDate(valentinesDay(2026).date)).toBe(
      "12 de junho",
    );
    expect(formatCelebrationDate(valentinesDay(2027).date)).toBe(
      "12 de junho",
    );
  });

  it("aponta o deste ano quando ele ainda não chegou", () => {
    const from = new Date("2026-03-10T12:00:00Z");
    const next = nextCelebration(from);

    expect(next.date.getUTCFullYear()).toBe(2026);
    expect(next.date.getTime()).toBeGreaterThan(from.getTime());
  });

  it("vira o ano quando o deste já passou", () => {
    expect(
      nextCelebration(new Date("2026-07-26T12:00:00Z")).date.getUTCFullYear(),
    ).toBe(2027);
  });

  it("vira o ano no próprio dia, depois da meia-noite de São Paulo", () => {
    // 12/06 às 03:00 UTC é a virada em São Paulo: a partir daí, já passou.
    const justAfter = new Date("2026-06-12T03:00:01Z");
    expect(nextCelebration(justAfter).date.getUTCFullYear()).toBe(2027);

    const justBefore = new Date("2026-06-12T02:59:59Z");
    expect(nextCelebration(justBefore).date.getUTCFullYear()).toBe(2026);
  });

  it("nunca devolve data no passado", () => {
    // Um dia de cada mês do ano, para não deixar buraco no calendário.
    for (let month = 0; month < 12; month++) {
      const from = new Date(Date.UTC(2026, month, 15, 12));
      expect(nextCelebration(from).date.getTime()).toBeGreaterThan(
        from.getTime(),
      );
    }
  });

  it("sempre traz o rótulo pronto para a barra", () => {
    expect(nextCelebration(new Date("2026-01-01T00:00:00Z")).label).toBe(
      "Dia dos Namorados",
    );
  });
});
