import { beforeEach, describe, expect, it } from "vitest";

import { hit, LIMITS, resetLimits, retryAfter } from "@/lib/rate-limit";

/**
 * Teto de requisições — SPEC 9.4.
 *
 * O que estes testes travam não é a contagem em si: é que a janela **fecha** e
 * que ela **reabre**. Um limitador que nunca reabre é um jeito lento de tirar o
 * próprio site do ar, e um que nunca fecha não é limitador nenhum.
 */
describe("limite de requisições", () => {
  beforeEach(() => {
    resetLimits();
  });

  it("deixa passar até o limite e barra a partir dele", () => {
    for (let i = 0; i < 3; i++) {
      expect(hit("teste", 3, 60_000)).toBe(true);
    }

    expect(hit("teste", 3, 60_000)).toBe(false);
    expect(hit("teste", 3, 60_000)).toBe(false);
  });

  it("conta cada chave separadamente — um visitante não gasta a cota do outro", () => {
    expect(hit("ip-a", 1, 60_000)).toBe(true);
    expect(hit("ip-a", 1, 60_000)).toBe(false);

    // O segundo IP chega com a cota inteira.
    expect(hit("ip-b", 1, 60_000)).toBe(true);
  });

  it("reabre a janela depois que o prazo passa", async () => {
    expect(hit("curto", 1, 30)).toBe(true);
    expect(hit("curto", 1, 30)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 45));

    expect(hit("curto", 1, 30)).toBe(true);
  });

  it("informa quantos segundos faltam para poder tentar de novo", () => {
    hit("espera", 1, 60_000);

    const segundos = retryAfter("espera");
    expect(segundos).toBeGreaterThan(0);
    expect(segundos).toBeLessThanOrEqual(60);
  });

  it("nunca devolve retryAfter de chave que nunca foi usada", () => {
    expect(retryAfter("inexistente")).toBe(0);
  });

  it("protege as rotas que custam dinheiro ou CPU", () => {
    // Se alguém afrouxar um destes sem pensar, o teste conta a história.
    expect(LIMITS.checkout.limit).toBeLessThanOrEqual(10);
    expect(LIMITS.qr.limit).toBeLessThanOrEqual(30);

    // Senha é a única barreira da página privada: janela longa, cota curta.
    expect(LIMITS.password.limit).toBeLessThanOrEqual(10);
    expect(LIMITS.password.windowMs).toBeGreaterThanOrEqual(60_000);
  });
});
