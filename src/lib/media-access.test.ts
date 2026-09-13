import { describe, expect, it } from "vitest";

import { decideAccess, siteIdFromKey } from "@/lib/media-access";

/**
 * Quem pode ver a foto — SPEC 9.4.
 *
 * A regra que estes testes travam é uma frase: **a foto vale o que a página dela
 * vale**. Cada combinação de estado da página com quem está pedindo tem um caso
 * aqui, porque é exatamente o tipo de tabela que se acerta na implementação e se
 * quebra seis meses depois ao mexer em outra coisa.
 */

const agora = new Date("2026-09-12T12:00:00.000Z");
const ontem = new Date("2026-09-11T12:00:00.000Z");
const amanha = new Date("2026-09-13T12:00:00.000Z");

const visitante = { unlocked: false, owner: false, at: agora };
const destravado = { unlocked: true, owner: false, at: agora };
const dono = { unlocked: false, owner: true, at: agora };

describe("página publicada e aberta", () => {
  const site = {
    status: "PUBLISHED" as const,
    passwordHash: null,
    expiresAt: null,
  };

  it("qualquer um vê — igual à página", () => {
    expect(decideAccess(site, visitante)).toBe("allow");
  });
});

describe("página publicada com senha", () => {
  const site = {
    status: "PUBLISHED" as const,
    passwordHash: "scrypt:sal:hash",
    expiresAt: null,
  };

  it("quem não digitou a senha não vê a foto", () => {
    // Este é o caso que motivou o arquivo: proteger o HTML e deixar a imagem
    // aberta não protege nada, porque a URL da imagem está dentro do HTML.
    expect(decideAccess(site, visitante)).toBe("deny");
  });

  it("quem destravou vê", () => {
    expect(decideAccess(site, destravado)).toBe("allow");
  });

  it("o dono vê sem digitar a própria senha", () => {
    expect(decideAccess(site, dono)).toBe("allow");
  });
});

describe("página expirada", () => {
  const site = {
    status: "PUBLISHED" as const,
    passwordHash: null,
    expiresAt: ontem,
  };

  it("saiu do ar, as fotos saíram junto", () => {
    expect(decideAccess(site, visitante)).toBe("deny");
  });

  it("o dono continua vendo — é dele, e é o que o painel mostra", () => {
    expect(decideAccess(site, dono)).toBe("allow");
  });

  it("prazo no futuro não é expiração", () => {
    expect(decideAccess({ ...site, expiresAt: amanha }, visitante)).toBe(
      "allow",
    );
  });

  it("expira no instante exato do prazo", () => {
    expect(decideAccess({ ...site, expiresAt: agora }, visitante)).toBe("deny");
  });
});

describe("rascunho ainda não publicado", () => {
  const site = {
    status: "DRAFT" as const,
    passwordHash: null,
    expiresAt: null,
  };

  it("só o dono vê", () => {
    expect(decideAccess(site, dono)).toBe("allow");
    expect(decideAccess(site, visitante)).toBe("deny");
  });

  it("nem quem tem cookie de destravamento de outra página vê", () => {
    expect(decideAccess(site, destravado)).toBe("deny");
  });

  it("pendente de pagamento também é rascunho", () => {
    expect(
      decideAccess({ ...site, status: "PENDING_PAYMENT" }, visitante),
    ).toBe("deny");
  });
});

describe("chave da mídia", () => {
  it("extrai o site de uma chave bem formada", () => {
    expect(siteIdFromKey("sites/abc123/foto-1")).toBe("abc123");
  });

  it("recusa qualquer coisa que não seja o formato esperado", () => {
    // Quem monta a chave é o cliente: adivinhar aqui é abrir a porta.
    expect(siteIdFromKey("sites/abc123")).toBeNull();
    expect(siteIdFromKey("outro/abc123/foto")).toBeNull();
    expect(siteIdFromKey("sites/abc/foto/extra")).toBeNull();
    expect(siteIdFromKey("")).toBeNull();
  });

  it("recusa travessia de caminho", () => {
    expect(siteIdFromKey("sites/../../etc/passwd")).toBeNull();
    expect(siteIdFromKey("sites/abc/../../segredo")).toBeNull();
    expect(siteIdFromKey("sites/a.b/foto")).toBeNull();
  });
});
