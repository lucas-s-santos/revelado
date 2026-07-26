import { describe, expect, it } from "vitest";

import {
  celebrationsFor,
  formatCelebrationDate,
  nextCelebration,
} from "@/lib/promo";

/**
 * A barra de promoção mostra essa data para todo visitante — errar aqui é errar
 * em público. Datas móveis conferidas no calendário: em 2026 o Dia das Mães é
 * 10 de maio e o Dia dos Pais é 9 de agosto.
 */
describe("promo", () => {
  it("calcula as datas móveis de 2026", () => {
    const celebrations = celebrationsFor(2026);
    const byId = new Map(celebrations.map((c) => [c.occasionId, c.date]));

    expect(formatCelebrationDate(byId.get("maes")!)).toBe("10 de maio");
    expect(formatCelebrationDate(byId.get("pais")!)).toBe("9 de agosto");
    expect(formatCelebrationDate(byId.get("namorados")!)).toBe("12 de junho");
    expect(formatCelebrationDate(byId.get("natal")!)).toBe("25 de dezembro");
  });

  it("devolve em ordem de calendário", () => {
    const dates = celebrationsFor(2027).map((c) => c.date.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it("aponta a próxima comemoração ainda por vir", () => {
    const from = new Date("2026-07-26T12:00:00Z");
    const next = nextCelebration(from);

    expect(next.occasionId).toBe("pais");
    expect(next.date.getTime()).toBeGreaterThan(from.getTime());
  });

  it("vira o ano quando todas já passaram", () => {
    const next = nextCelebration(new Date("2026-12-26T12:00:00Z"));

    expect(next.date.getUTCFullYear()).toBe(2027);
    expect(next.occasionId).toBe("maes"); // primeira do calendário
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
});
