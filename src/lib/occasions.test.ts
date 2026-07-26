import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { OCCASION_IDS, OCCASIONS } from "@/lib/occasions";

const theme = readFileSync("src/styles/theme.css", "utf8");

describe("occasions", () => {
  it("cobre as 8 ocasiões da seção 4.1, sem slug repetido", () => {
    expect(OCCASIONS).toHaveLength(OCCASION_IDS.length);
    expect(new Set(OCCASIONS.map((o) => o.slug)).size).toBe(OCCASIONS.length);
  });

  it("usa accent em RGB sem vírgula", () => {
    for (const occasion of OCCASIONS) {
      expect(occasion.accent).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
  });

  it("tem o accent de cada ocasião declarado em theme.css", () => {
    for (const occasion of OCCASIONS) {
      expect(theme).toContain(`--accent-${occasion.id}: ${occasion.accent}`);
      expect(theme).toContain(`[data-occasion="${occasion.id}"]`);
    }
  });

  it("mantém a ordem de exibição sem buraco nem empate", () => {
    const orders = OCCASIONS.map((o) => o.order).sort((a, b) => a - b);
    expect(orders).toEqual(
      Array.from({ length: OCCASIONS.length }, (_, i) => i + 1),
    );
  });
});
