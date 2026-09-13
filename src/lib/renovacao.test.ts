import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { defaultContent } from "@/lib/blocks/defaults";
import { getDraft } from "@/lib/drafts";
import { EXPIRING_WITHIN_MS, siteExpiring } from "@/lib/jobs";
import { createDraft } from "@/lib/drafts";
import { attachCharge, createOrder, transitionOrder } from "@/lib/orders";
import { nextExpiry, publishSite } from "@/lib/publish";
import { testDevStore } from "@/lib/test-dev-store";

/**
 * Renovação — SPEC 8.7.
 *
 * O aviso de `site.expiring` e a página expirada mandam a pessoa renovar. Estes
 * testes existem para essa promessa não virar um botão que cobra e não entrega,
 * e travam três regras:
 *
 *  1. **renovar cedo soma, não substitui.** O aviso sai quinze dias antes; se
 *     renovar antes custasse esses quinze dias, o e-mail estaria pedindo para a
 *     pessoa se prejudicar por ser precavida;
 *  2. **a página renovada volta a ser avisada.** Sem limpar a marca do ciclo
 *     anterior, o cliente descobriria o próximo vencimento pela página fora do ar;
 *  3. **página no ar não sai do ar para renovar.** O pedido não pode mudar o
 *     status de uma página que está funcionando enquanto o Pix não cai.
 */

const store = testDevStore();
beforeEach(store.arm);
afterAll(store.clean);

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-09-13T12:00:00.000Z");

describe("a conta do novo prazo", () => {
  it("renovar cedo soma ao que ainda falta", () => {
    // Faltavam 15 dias; um plano de 365 leva para 380, não para 365.
    const faltam15 = new Date(agora.getTime() + 15 * DIA);

    const novo = nextExpiry({
      current: faltam15,
      durationDays: 365,
      bumpForever: false,
      now: agora,
    });

    expect(novo?.getTime()).toBe(faltam15.getTime() + 365 * DIA);
  });

  it("página já expirada recomeça de hoje", () => {
    // O tempo fora do ar não era tempo de serviço: não vira crédito.
    const venceuOntem = new Date(agora.getTime() - DIA);

    const novo = nextExpiry({
      current: venceuOntem,
      durationDays: 365,
      bumpForever: false,
      now: agora,
    });

    expect(novo?.getTime()).toBe(agora.getTime() + 365 * DIA);
  });

  it("o bump 'para sempre' tira o prazo, venha de onde vier", () => {
    expect(
      nextExpiry({
        current: new Date(agora.getTime() + 30 * DIA),
        durationDays: 365,
        bumpForever: true,
        now: agora,
      }),
    ).toBeNull();
  });

  it("plano vitalício não ganha data", () => {
    expect(
      nextExpiry({
        current: null,
        durationDays: null,
        bumpForever: false,
        now: agora,
      }),
    ).toBeNull();
  });

  it("página nova conta de hoje", () => {
    const novo = nextExpiry({
      current: null,
      durationDays: 365,
      bumpForever: false,
      now: agora,
    });

    expect(novo?.getTime()).toBe(agora.getTime() + 365 * DIA);
  });
});

async function paginaNoAr() {
  const draft = await createDraft({
    occasionId: "namorados",
    content: defaultContent("namorados"),
    anonId: "dono-teste",
  });

  const order = await createOrder({
    siteId: draft.id,
    planId: "especial", // 365 dias
    bumpForever: false,
    amountCents: 3490,
    email: "teste@revelado.com.br",
  });
  await attachCharge(order.id, { providerRef: `sim_${order.id}` });
  await transitionOrder(order.id, "PAID");
  await publishSite({ ...order, status: "PAID" });

  return { draft, order };
}

describe("renovar uma página que está no ar", () => {
  it("estica o prazo em vez de recomeçar, e diz que foi renovação", async () => {
    const { draft } = await paginaNoAr();

    const antes = (await getDraft(draft.id))?.expiresAt;
    expect(antes, "a estreia já define um prazo").not.toBeNull();

    // Segunda compra da mesma página: é renovação.
    const renovacao = await createOrder({
      siteId: draft.id,
      planId: "especial",
      bumpForever: false,
      amountCents: 3490,
      email: "teste@revelado.com.br",
    });
    await attachCharge(renovacao.id, { providerRef: `sim_${renovacao.id}` });
    await transitionOrder(renovacao.id, "PAID");

    const result = await publishSite({ ...renovacao, status: "PAID" });

    expect(result?.renewed, "o webhook precisa saber que é renovação").toBe(
      true,
    );

    const depois = (await getDraft(draft.id))?.expiresAt;
    expect(depois!.getTime()).toBeGreaterThan(antes!.getTime());

    // Um ano a mais sobre o que faltava, não um ano a partir de hoje.
    const somado = antes!.getTime() + 365 * DIA;
    expect(Math.abs(depois!.getTime() - somado)).toBeLessThan(60_000);
  });

  it("a página renovada volta a ser avisada no próximo ciclo", async () => {
    const { draft } = await paginaNoAr();

    // Encurta o prazo para cair na janela de aviso e deixa o job marcar.
    const { markDraftPublished } = await import("@/lib/publish-store");
    await markDraftPublished(draft.id, new Date(Date.now() + 10 * DIA));

    await siteExpiring();
    expect((await getDraft(draft.id))?.expiringNotifiedAt).not.toBeNull();

    // Renova: a marca tem que sair, senão o próximo vencimento chega calado.
    const renovacao = await createOrder({
      siteId: draft.id,
      planId: "especial",
      bumpForever: false,
      amountCents: 3490,
      email: "teste@revelado.com.br",
    });
    await attachCharge(renovacao.id, { providerRef: `sim_${renovacao.id}` });
    await transitionOrder(renovacao.id, "PAID");
    await publishSite({ ...renovacao, status: "PAID" });

    expect((await getDraft(draft.id))?.expiringNotifiedAt).toBeNull();
  });

  it("a página continua PUBLICADA enquanto o Pix da renovação não cai", async () => {
    const { draft } = await paginaNoAr();

    // Só cria o pedido: ninguém pagou ainda.
    await createOrder({
      siteId: draft.id,
      planId: "especial",
      bumpForever: false,
      amountCents: 3490,
      email: "teste@revelado.com.br",
    });

    // O presente não pode sair do ar justamente porque a pessoa decidiu pagar
    // para ele continuar.
    expect((await getDraft(draft.id))?.status).toBe("PUBLISHED");
  });

  it("a janela de aviso continua sendo a da SPEC", () => {
    expect(EXPIRING_WITHIN_MS).toBe(15 * DIA);
  });
});
