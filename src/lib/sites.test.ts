import { describe, expect, it } from "vitest";

import { demoContent, DEMO_SLUG } from "@/lib/blocks/fixtures";
import { isExpired, type PublishedSite } from "@/lib/sites";

/**
 * A expiração da página publicada — SPEC 8.8.
 *
 * Este arquivo existe por causa de um defeito que passou por todos os outros
 * testes e só apareceu no e2e: a leitura da página passa por `unstable_cache`,
 * que **serializa** o que guarda. Na volta do cache, `expiresAt` não é mais um
 * `Date` — é a string ISO dele. `isExpired` chamava `.getTime()` nessa string e
 * a página publicada devolvia 500.
 *
 * O detalhe cruel: o primeiro acesso funcionava (valor fresco, ainda `Date`) e
 * só o segundo quebrava. Passava em qualquer teste manual e falhava com o
 * público — na página que é o produto entregue, no dia do presente.
 */

function site(expiresAt: Date | null): PublishedSite {
  return {
    id: "site-1",
    slug: DEMO_SLUG,
    content: demoContent,
    hasPassword: false,
    indexable: false,
    expiresAt,
  };
}

/** Simula a ida e volta pelo cache do Next. */
function peloCache(valor: PublishedSite): PublishedSite {
  return JSON.parse(JSON.stringify(valor)) as PublishedSite;
}

describe("expiração da página publicada", () => {
  const ontem = new Date("2026-09-11T12:00:00.000Z");
  const amanha = new Date("2026-09-13T12:00:00.000Z");
  const agora = new Date("2026-09-12T12:00:00.000Z");

  it("página vitalícia nunca expira", () => {
    expect(isExpired(site(null), agora)).toBe(false);
  });

  it("com prazo no futuro, continua no ar", () => {
    expect(isExpired(site(amanha), agora)).toBe(false);
  });

  it("com prazo vencido, expirou", () => {
    expect(isExpired(site(ontem), agora)).toBe(true);
  });

  it("expira no instante exato do prazo, não um segundo depois", () => {
    expect(isExpired(site(agora), agora)).toBe(true);
  });

  it("não quebra quando a data volta serializada do cache", () => {
    // `JSON.parse(JSON.stringify(...))` é exatamente o que o cache faz com a
    // data. Antes do conserto, isto lançava "getTime is not a function".
    const doCache = peloCache(site(ontem));

    expect(typeof (doCache.expiresAt as unknown)).toBe("string");
    expect(() => isExpired(doCache, agora)).not.toThrow();
    expect(isExpired(doCache, agora)).toBe(true);
  });

  it("a data serializada de uma página no ar também é lida certo", () => {
    const doCache = peloCache(site(amanha));
    expect(isExpired(doCache, agora)).toBe(false);
  });
});
