import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A trava do controle de posse do rascunho.
 *
 * `podeMexerNoRascunho` é a regra única que três rotas usam (autosave,
 * checkout, upload). Ela era fail-open em três formas espalhadas — sem dono,
 * liberava. Estes testes fixam o contrato oposto: **sem dono, nega**, e com
 * dono só o cookie igual passa. É o mesmo tipo de regressão que o teste do
 * webhook trava do outro lado.
 */

let cookieAtual: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === "revelado_anon" && cookieAtual !== undefined
        ? { value: cookieAtual }
        : undefined,
  }),
}));

const { podeMexerNoRascunho } = await import("@/lib/anon");

describe("posse do rascunho (fail-closed)", () => {
  beforeEach(() => {
    cookieAtual = undefined;
  });

  it("rascunho SEM dono é negado, mesmo com cookie", async () => {
    cookieAtual = "alguem";
    expect(await podeMexerNoRascunho(null)).toBe(false);
  });

  it("dono certo passa", async () => {
    cookieAtual = "dono-X";
    expect(await podeMexerNoRascunho("dono-X")).toBe(true);
  });

  it("cookie de outro é negado", async () => {
    cookieAtual = "invasor";
    expect(await podeMexerNoRascunho("dono-X")).toBe(false);
  });

  it("sem cookie nenhum é negado", async () => {
    cookieAtual = undefined;
    expect(await podeMexerNoRascunho("dono-X")).toBe(false);
  });
});
