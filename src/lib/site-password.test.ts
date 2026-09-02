import { describe, expect, it } from "vitest";

import {
  hashPassword,
  unlockToken,
  verifyPassword,
} from "@/lib/site-password";

/**
 * A base da senha da página (Fase 6). A APLICAÇÃO ainda não está ligada — ver
 * o aviso em `p/[slug]/page.tsx` — mas a criptografia por baixo precisa estar
 * correta antes de alguém confiar nela. Estes testes travam isso.
 */
describe("senha da página publicada", () => {
  it("a senha certa abre, a errada não", async () => {
    const hash = await hashPassword("nosso-aniversário");
    expect(await verifyPassword("nosso-aniversário", hash)).toBe(true);
    expect(await verifyPassword("chute", hash)).toBe(false);
  });

  it("o mesmo texto gera hashes diferentes (salt por senha)", async () => {
    const a = await hashPassword("igual");
    const b = await hashPassword("igual");
    expect(a).not.toBe(b); // salt aleatório
    // ...mas os dois abrem com a senha certa.
    expect(await verifyPassword("igual", a)).toBe(true);
    expect(await verifyPassword("igual", b)).toBe(true);
  });

  it("hash malformado não abre (nunca lança)", async () => {
    expect(await verifyPassword("x", "lixo")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "scrypt:só-salt")).toBe(false);
  });

  it("trocar a senha invalida o cookie de unlock antigo", async () => {
    const antigo = await hashPassword("senha-1");
    const novo = await hashPassword("senha-2");
    // O cookie é derivado do hash: hash novo, token novo, cookie velho não bate.
    expect(unlockToken(antigo)).not.toBe(unlockToken(novo));
  });
});
