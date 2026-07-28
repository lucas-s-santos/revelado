import { rm } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { defaultContent } from "@/lib/blocks/defaults";
import { createDraft, updateSitePrivacy } from "@/lib/drafts";
import {
  hashPassword,
  unlockCookie,
  unlockToken,
  verifyPassword,
} from "@/lib/site-password";
import { sitePasswordHash } from "@/lib/sites";

/**
 * Senha da página publicada — SPEC 8.8 e 9.4.
 *
 * A senha é a única barreira entre o conteúdo e quem tiver o link, então o que
 * estes testes travam não é o caminho feliz: é que **trocar a senha derruba os
 * cookies antigos** e que o hash nunca vira previsível.
 */

const DEV_DIR = join(process.cwd(), ".drafts");

describe("senha da página", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(async () => {
    await rm(DEV_DIR, { recursive: true, force: true });
  });

  it("aceita a senha certa e recusa a errada", async () => {
    const stored = await hashPassword("nosso-lugar");

    expect(await verifyPassword("nosso-lugar", stored)).toBe(true);
    expect(await verifyPassword("nosso lugar", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("a mesma senha gera hashes diferentes — o salt é por página", async () => {
    const a = await hashPassword("igual");
    const b = await hashPassword("igual");

    expect(a).not.toBe(b);
    expect(await verifyPassword("igual", a)).toBe(true);
    expect(await verifyPassword("igual", b)).toBe(true);
  });

  it("hash corrompido não abre a página", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5:abc:def")).toBe(false);
    expect(await verifyPassword("x", "scrypt:so-o-salt")).toBe(false);
  });

  it("trocar a senha invalida o cookie antigo", async () => {
    const antiga = await hashPassword("primeira");
    const nova = await hashPassword("segunda");

    // O cookie é derivado do hash: quem já estava dentro precisa entrar de novo.
    expect(unlockToken(antiga)).not.toBe(unlockToken(nova));
    // E é estável para o mesmo hash, senão a pessoa seria expulsa a cada visita.
    expect(unlockToken(antiga)).toBe(unlockToken(antiga));
  });

  it("o cookie é por página: destravar uma não destrava a outra", () => {
    expect(unlockCookie("namorados-abc")).not.toBe(
      unlockCookie("namorados-xyz"),
    );
  });

  it("define, troca e remove a senha de um rascunho", async () => {
    const draft = await createDraft({
      occasionId: "namorados",
      content: defaultContent("namorados"),
      anonId: "teste-senha",
    });

    expect(await sitePasswordHash(draft.slug)).toBeNull();

    await updateSitePrivacy(draft.id, {
      passwordHash: await hashPassword("abre-te"),
    });

    const stored = await sitePasswordHash(draft.slug);
    expect(stored).not.toBeNull();
    expect(await verifyPassword("abre-te", stored!)).toBe(true);

    // Salvar em branco no painel tira a senha; a página volta a abrir direto.
    await updateSitePrivacy(draft.id, { passwordHash: null });
    expect(await sitePasswordHash(draft.slug)).toBeNull();
  });

  it("mexer na indexação não apaga a senha por tabela", async () => {
    const draft = await createDraft({
      occasionId: "aniversario",
      content: defaultContent("aniversario"),
      anonId: "teste-senha",
    });

    await updateSitePrivacy(draft.id, {
      passwordHash: await hashPassword("continua"),
    });
    const updated = await updateSitePrivacy(draft.id, { indexable: true });

    expect(updated?.indexable).toBe(true);
    expect(updated?.passwordHash).not.toBeNull();
    expect(await verifyPassword("continua", updated!.passwordHash!)).toBe(true);
  });
});
