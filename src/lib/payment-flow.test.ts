import { rm } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { defaultContent } from "@/lib/blocks/defaults";
import { createDraft, getDraft } from "@/lib/drafts";
import { mapPaymentStatus } from "@/lib/mercadopago";
import {
  attachCharge,
  createOrder,
  findByProviderRef,
  getOrder,
  transitionOrder,
} from "@/lib/orders";
import { publishSite } from "@/lib/publish";
import { getPublishedSite } from "@/lib/sites";

/**
 * Aceite da Fase 5 (SPEC 13): "e2e cobrindo **pago, pendente, expirado e
 * reembolsado**".
 *
 * Estes testes exercitam a máquina de estados do pedido direto, sem navegador —
 * é onde mora o risco de verdade. As duas regras que eles existem para travar:
 *
 *  1. **nenhuma página publica sem passar por PAID** (anti-padrão 6);
 *  2. **a mesma notificação chegando de novo não faz nada** — o Mercado Pago
 *     reenvia webhook, e reenviar não pode publicar duas vezes.
 */

const DEV_DIR = join(process.cwd(), ".drafts");

async function novaCompra() {
  const draft = await createDraft({
    occasionId: "namorados",
    content: defaultContent("namorados"),
    anonId: "teste",
  });

  const order = await createOrder({
    siteId: draft.id,
    planId: "especial",
    bumpForever: false,
    amountCents: 3490,
    email: "teste@revelado.com.br",
  });

  await attachCharge(order.id, { providerRef: `sim_${order.id}` });

  return { draft, order };
}

/** O que o webhook faz: transiciona e, só se mudou para PAID, publica. */
async function receberWebhook(
  orderId: string,
  status: Parameters<typeof transitionOrder>[1],
) {
  const { order, changed } = await transitionOrder(orderId, status);
  if (!order) return { changed: false, published: null };

  const published =
    changed && status === "PAID" ? await publishSite(order) : null;
  return { changed, published };
}

describe("fluxo de pagamento", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(async () => {
    await rm(DEV_DIR, { recursive: true, force: true });
  });

  it("pago: publica a página e marca o pedido", async () => {
    const { draft, order } = await novaCompra();

    expect((await getDraft(draft.id))?.status).toBe("DRAFT");

    const result = await receberWebhook(order.id, "PAID");

    expect(result.changed).toBe(true);
    expect(result.published?.slug).toBe(draft.slug);
    expect((await getOrder(order.id))?.status).toBe("PAID");
    expect((await getDraft(draft.id))?.status).toBe("PUBLISHED");
  });

  it("pago duas vezes: a segunda não faz nada (idempotência)", async () => {
    const { order } = await novaCompra();

    const primeira = await receberWebhook(order.id, "PAID");
    const segunda = await receberWebhook(order.id, "PAID");

    expect(primeira.changed).toBe(true);
    expect(primeira.published).not.toBeNull();

    // A segunda notificação não republica nem reenvia e-mail.
    expect(segunda.changed).toBe(false);
    expect(segunda.published).toBeNull();
  });

  it("pendente: não publica nada", async () => {
    const { draft, order } = await novaCompra();

    const result = await receberWebhook(order.id, "PENDING");

    expect(result.published).toBeNull();
    expect((await getDraft(draft.id))?.status).toBe("DRAFT");
  });

  it("expirado: não publica e o rascunho continua editável", async () => {
    const { draft, order } = await novaCompra();

    await receberWebhook(order.id, "EXPIRED");

    expect((await getOrder(order.id))?.status).toBe("EXPIRED");
    expect((await getDraft(draft.id))?.status).toBe("DRAFT");
  });

  it("pagamento que confirma depois de expirar ainda publica", async () => {
    // SPEC 8.5: "pagamento que confirma 2 dias depois publica normalmente".
    const { draft, order } = await novaCompra();

    await receberWebhook(order.id, "EXPIRED");
    const tardio = await receberWebhook(order.id, "PAID");

    expect(tardio.changed).toBe(true);
    expect((await getDraft(draft.id))?.status).toBe("PUBLISHED");
  });

  it("reembolsado depois de pago: registra o reembolso", async () => {
    const { order } = await novaCompra();

    await receberWebhook(order.id, "PAID");
    const reembolso = await receberWebhook(order.id, "REFUNDED");

    expect(reembolso.changed).toBe(true);
    expect((await getOrder(order.id))?.status).toBe("REFUNDED");
  });

  it("pago não regride para pendente por notificação fora de ordem", async () => {
    const { order } = await novaCompra();

    await receberWebhook(order.id, "PAID");
    const atrasada = await receberWebhook(order.id, "PENDING");

    expect(atrasada.changed).toBe(false);
    expect((await getOrder(order.id))?.status).toBe("PAID");
  });

  it("a página publicada fica acessível pelo slug", async () => {
    // Este teste existe porque a falha passou por todos os outros: o pedido
    // ficava PAID, o rascunho virava PUBLISHED, e /p/[slug] dava 404 — a busca
    // por slug não existia no backend de arquivo. Pagar e receber um 404 é o
    // pior defeito possível neste produto.
    const { draft, order } = await novaCompra();

    expect(await getPublishedSite(draft.slug)).toBeNull(); // antes de pagar

    await receberWebhook(order.id, "PAID");

    const published = await getPublishedSite(draft.slug);
    expect(published).not.toBeNull();
    expect(published?.slug).toBe(draft.slug);
    expect(published?.content.blocks.length).toBeGreaterThan(0);
  });

  it("acha o pedido pelo providerRef, que é a chave do webhook", async () => {
    const { order } = await novaCompra();

    const found = await findByProviderRef(`sim_${order.id}`);
    expect(found?.id).toBe(order.id);
    expect(await findByProviderRef("nao-existe")).toBeNull();
  });
});

describe("tradução do status do Mercado Pago", () => {
  it("mapeia os status conhecidos", () => {
    expect(mapPaymentStatus("approved")).toBe("PAID");
    expect(mapPaymentStatus("authorized")).toBe("PAID");
    expect(mapPaymentStatus("refunded")).toBe("REFUNDED");
    expect(mapPaymentStatus("charged_back")).toBe("REFUNDED");
    expect(mapPaymentStatus("rejected")).toBe("FAILED");
    expect(mapPaymentStatus("cancelled")).toBe("EXPIRED");
    expect(mapPaymentStatus("pending")).toBe("PENDING");
    expect(mapPaymentStatus("in_process")).toBe("PENDING");
  });

  it("status novo do provedor nunca vira pago por engano", () => {
    expect(mapPaymentStatus("status_que_ainda_nao_existe")).toBe("PENDING");
    expect(mapPaymentStatus("")).toBe("PENDING");
  });
});
