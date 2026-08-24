import { describe, expect, it } from "vitest";

import { PALETTE_IDS, SKIN_IDS } from "@/lib/palettes";
import { DEFAULT_THEME, getTheme, isThemeUnlocked, THEMES } from "@/lib/themes";

describe("temas", () => {
  it("o padrão existe na grade", () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME)).toBe(true);
  });

  it("não repete id", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("só aponta para pele e paleta que existem", () => {
    for (const tema of THEMES) {
      expect(SKIN_IDS).toContain(tema.skin);
      expect(PALETTE_IDS).toContain(tema.palette);
    }
  });

  it("tema desconhecido cai no padrão em vez de quebrar", () => {
    expect(getTheme("nao-existe").id).toBe(DEFAULT_THEME);
  });
});

describe("trava de plano", () => {
  const livre = THEMES.find((t) => !t.minPlan)!;
  const travado = THEMES.find((t) => t.minPlan === "especial")!;

  it("tema livre passa mesmo sem plano escolhido", () => {
    expect(isThemeUnlocked(livre, null)).toBe(true);
    expect(isThemeUnlocked(livre, "simples")).toBe(true);
  });

  it("tema travado não passa sem plano nem no plano abaixo", () => {
    expect(isThemeUnlocked(travado, null)).toBe(false);
    expect(isThemeUnlocked(travado, "simples")).toBe(false);
  });

  it("destrava no plano exigido", () => {
    expect(isThemeUnlocked(travado, "especial")).toBe(true);
  });

  it("plano melhor nunca perde o que o de baixo já tinha", () => {
    // A regressão clássica: comparar id por igualdade em vez de por ordem.
    expect(isThemeUnlocked(travado, "para-sempre")).toBe(true);
  });
});
