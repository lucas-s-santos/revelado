import { beforeEach, describe, expect, it } from "vitest";

import { accessToken, successUrl, verifyAccessToken } from "@/lib/access-token";

/**
 * Link assinado — SPEC 9.4.
 *
 * O token existe para `/sucesso` abrir no computador de quem pagou no celular
 * sem abrir para quem só adivinhou o id do pedido. Os dois lados dessa frase
 * estão testados aqui.
 */
describe("link assinado", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "segredo-de-teste";
  });

  it("aceita o token que ele mesmo gerou", () => {
    const token = accessToken("order", "pedido-1");
    expect(verifyAccessToken("order", "pedido-1", token)).toBe(true);
  });

  it("recusa token de outro pedido", () => {
    const token = accessToken("order", "pedido-1");
    expect(verifyAccessToken("order", "pedido-2", token)).toBe(false);
  });

  it("recusa token de outro uso, mesmo com o id certo", () => {
    // O escopo é o que impede um token de pedido virar chave de outra coisa.
    const token = accessToken("outro-uso", "pedido-1");
    expect(verifyAccessToken("order", "pedido-1", token)).toBe(false);
  });

  it("recusa ausência de token — o caminho de quem só adivinhou o id", () => {
    expect(verifyAccessToken("order", "pedido-1", undefined)).toBe(false);
    expect(verifyAccessToken("order", "pedido-1", null)).toBe(false);
    expect(verifyAccessToken("order", "pedido-1", "")).toBe(false);
  });

  it("recusa token de tamanho diferente sem estourar na comparação", () => {
    expect(verifyAccessToken("order", "pedido-1", "curto")).toBe(false);
    expect(verifyAccessToken("order", "pedido-1", "x".repeat(200))).toBe(false);
  });

  it("muda o token quando o segredo muda — trocar AUTH_SECRET invalida links", () => {
    const antes = accessToken("order", "pedido-1");

    process.env.AUTH_SECRET = "outro-segredo";
    const depois = accessToken("order", "pedido-1");

    expect(depois).not.toBe(antes);
    expect(verifyAccessToken("order", "pedido-1", antes)).toBe(false);
  });

  it("monta a URL de sucesso com a prova embutida", () => {
    const url = successUrl("https://revelado.com.br", "pedido-1");

    expect(url).toContain("/sucesso/pedido-1?t=");

    const token = new URL(url).searchParams.get("t");
    expect(verifyAccessToken("order", "pedido-1", token)).toBe(true);
  });
});
