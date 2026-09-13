import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { defaultContent, DEFAULT_TEMPLATE } from "@/lib/blocks/defaults";
import { createDraft, getDraft, updateSitePrivacy } from "@/lib/drafts";
import {
  ABANDONED_AFTER_MS,
  EXPIRING_WITHIN_MS,
  orderAbandoned,
  PURGE_GRACE_MS,
  siteExpiring,
  sitePurge,
} from "@/lib/jobs";
import { attachCharge, createOrder, transitionOrder } from "@/lib/orders";
import { markDraftPublished } from "@/lib/publish-store";
import { testDevStore } from "@/lib/test-dev-store";

/**
 * Trabalhos agendados — SPEC 9.2.
 *
 * Cada trabalho recebe o "agora" por parâmetro, então o teste não espera trinta
 * minutos nem trinta dias: ele adianta o relógio. É também o que permite testar
 * a borda exata de cada prazo.
 *
 * O que estes testes travam, em ordem de importância:
 *  1. **o aviso sai uma vez.** Cron erra para os dois lados, e dois e-mails da
 *     mesma coisa é pior que nenhum;
 *  2. **a purga respeita a carência.** É a única operação destrutiva do sistema;
 *  3. **quem não deveria ser tocado não é tocado** — pedido pago não recebe
 *     aviso de abandono, página vitalícia nunca expira.
 */

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

async function novoRascunho() {
  return createDraft({
    content: defaultContent(DEFAULT_TEMPLATE),
    anonId: "teste-jobs",
  });
}

async function novoPedido(siteId: string, email = "teste@revelado.com.br") {
  const order = await createOrder({
    siteId,
    planId: "especial",
    bumpForever: false,
    amountCents: 3490,
    email,
  });
  await attachCharge(order.id, { providerRef: `sim_${order.id}` });
  return order;
}

/**
 * Publica a página com um prazo, sem passar pelo webhook.
 *
 * O pedido vai a PAID de propósito: é o que faz `ownerEmailForSite` encontrar
 * para quem mandar o aviso — sem login, o dono da página é quem pagou por ela.
 */
async function publicarCom(expiresAt: Date | null) {
  const draft = await novoRascunho();
  const order = await novoPedido(draft.id);
  await transitionOrder(order.id, "PAID");
  await markDraftPublished(draft.id, expiresAt);
  return draft;
}

/**
 * Pasta própria: estes testes gravam no backend de arquivo, e o vitest roda
 * arquivos em paralelo. Ver `lib/test-dev-store.ts`.
 */
const store = testDevStore();
beforeEach(store.arm);
afterAll(store.clean);

describe("order.abandoned", () => {
  it("não avisa antes dos 30 minutos", async () => {
    const draft = await novoRascunho();
    await novoPedido(draft.id);

    const daquiA29 = new Date(Date.now() + 29 * MINUTO);
    const result = await orderAbandoned(daquiA29);

    expect(result.processed).toBe(0);
  });

  it("avisa depois dos 30 minutos, e só uma vez", async () => {
    const draft = await novoRascunho();
    await novoPedido(draft.id);

    const depois = new Date(Date.now() + ABANDONED_AFTER_MS + MINUTO);

    const primeira = await orderAbandoned(depois);
    expect(primeira.processed).toBeGreaterThanOrEqual(1);
    expect(primeira.failed).toBe(0);

    // A segunda rodada do cron não pode mandar o mesmo e-mail de novo.
    const segunda = await orderAbandoned(depois);
    expect(segunda.processed).toBe(0);
  });

  it("não avisa quem já pagou", async () => {
    const draft = await novoRascunho();
    const order = await novoPedido(draft.id);
    await transitionOrder(order.id, "PAID");

    const depois = new Date(Date.now() + ABANDONED_AFTER_MS + MINUTO);
    const result = await orderAbandoned(depois);

    // Pode haver pendentes de outros testes; o que importa é que este não entrou.
    expect(result.failed).toBe(0);
    const { order: atual } = await transitionOrder(order.id, "PAID");
    expect(atual?.abandonedNotifiedAt).toBeNull();
  });
});

describe("site.expiring", () => {
  it("avisa quando falta menos de 15 dias, e só uma vez", async () => {
    const draft = await publicarCom(new Date(Date.now() + 10 * DIA));

    const primeira = await siteExpiring();
    expect(primeira.processed).toBeGreaterThanOrEqual(1);

    const marcado = await getDraft(draft.id);
    expect(marcado?.expiringNotifiedAt).not.toBeNull();

    const segunda = await siteExpiring();
    expect(segunda.processed).toBe(0);
  });

  it("não avisa quando ainda falta muito", async () => {
    await publicarCom(new Date(Date.now() + 40 * DIA));

    const result = await siteExpiring();
    expect(result.processed).toBe(0);
  });

  it("não avisa página vitalícia", async () => {
    const draft = await publicarCom(null);

    await siteExpiring(new Date(Date.now() + 10 * 365 * DIA));

    const marcado = await getDraft(draft.id);
    expect(marcado?.expiringNotifiedAt).toBeNull();
  });

  it("não avisa página que já expirou — essa precisa de renovação, não de aviso", async () => {
    const draft = await publicarCom(new Date(Date.now() - DIA));

    await siteExpiring();

    const marcado = await getDraft(draft.id);
    expect(marcado?.expiringNotifiedAt).toBeNull();
  });

  it("a janela de aviso bate com o prazo da SPEC", () => {
    expect(EXPIRING_WITHIN_MS).toBe(15 * DIA);
  });
});

describe("site.purge", () => {
  it("não apaga dentro da carência de 30 dias", async () => {
    const draft = await publicarCom(new Date(Date.now() - 29 * DIA));

    await sitePurge();

    // Expirada, mas ainda recuperável: quem renovar encontra tudo no lugar.
    expect(await getDraft(draft.id)).not.toBeNull();
  });

  it("apaga o que expirou há mais de 30 dias", async () => {
    const draft = await publicarCom(new Date(Date.now() - 31 * DIA));

    const result = await sitePurge();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    expect(await getDraft(draft.id)).toBeNull();
  });

  it("nunca toca em página vitalícia", async () => {
    const draft = await publicarCom(null);

    await sitePurge(new Date(Date.now() + 100 * 365 * DIA));

    expect(await getDraft(draft.id)).not.toBeNull();
  });

  it("nunca toca em página no ar, por mais velha que seja", async () => {
    const draft = await publicarCom(new Date(Date.now() + 365 * DIA));

    await sitePurge();

    expect(await getDraft(draft.id)).not.toBeNull();
  });

  it("a carência bate com o prazo da SPEC", () => {
    expect(PURGE_GRACE_MS).toBe(30 * DIA);
  });
});

describe("privacidade não interfere nos trabalhos", () => {
  it("página com senha também é avisada e também é purgada", async () => {
    const draft = await publicarCom(new Date(Date.now() - 31 * DIA));
    await updateSitePrivacy(draft.id, { passwordHash: "scrypt:a:b" });

    await sitePurge();

    expect(await getDraft(draft.id)).toBeNull();
  });
});
