import { NextResponse } from "next/server";
import { z } from "zod";

import { isDraftOwner } from "@/lib/anon";
import { validateForPublish } from "@/lib/blocks/schema";
import { applyCoupon } from "@/lib/coupons";
import { getDraft } from "@/lib/drafts";
import { createPixCharge } from "@/lib/mercadopago";
import { attachCharge, createOrder } from "@/lib/orders";
import { orderTotalCents, PLAN_IDS, type PlanId } from "@/lib/plans";
import { limitOr429 } from "@/lib/rate-limit";
import { logDenied } from "@/lib/security-log";

/**
 * Cria o pedido e a cobrança — SPEC 9.1.
 *
 * O que esta rota **não** faz: publicar. Ela cria a cobrança e para. Publicar é
 * atribuição exclusiva do webhook (anti-padrão 6).
 *
 * O total é recalculado aqui do zero, a partir do plano e do cupom. O que o
 * cliente mandou de preço é ignorado — senão qualquer um paga R$ 0,01 editando
 * o corpo da requisição.
 */

const bodySchema = z.object({
  draftId: z.string().min(1),
  planId: z.enum(PLAN_IDS),
  bumpForever: z.boolean().default(false),
  email: z.email("Confira o seu e-mail — parece que falta alguma coisa nele."),
  coupon: z.string().max(32).optional(),
});

export async function POST(request: Request) {
  // Cada chamada abre uma cobrança de verdade no provedor (SPEC 9.4).
  const limited = await limitOr429(
    "checkout",
    "Muitas tentativas de pagamento seguidas. Espere um minuto.",
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const { draftId, planId, bumpForever, email, coupon } = parsed.data;

  const draft = await getDraft(draftId);
  if (!draft) {
    return NextResponse.json(
      { error: "Não encontramos sua página." },
      { status: 404 },
    );
  }

  if (!(await isDraftOwner(draft))) {
    await logDenied("owner-mismatch", { rota: "checkout", draftId });
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  // Página já no ar **não** é erro: é renovação (SPEC 8.7). O que muda é o que
  // o webhook faz ao confirmar — estica o prazo em vez de estrear (ver
  // `nextExpiry` em lib/publish.ts). Aqui o fluxo é o mesmo.

  // Portão da publicação (SPEC 7.2): não cobrar por uma página que sairia vazia.
  const issues = validateForPublish(draft.content);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: issues[0]?.message, issues },
      { status: 422 },
    );
  }

  const discount = coupon ? await applyCoupon(coupon) : null;
  if (coupon && !discount) {
    return NextResponse.json(
      { error: "Esse cupom não está valendo. Confira o código." },
      { status: 422 },
    );
  }

  const amountCents = orderTotalCents({
    planId: planId as PlanId,
    bumpForever,
    coupon: discount ?? undefined,
  });

  const order = await createOrder({
    siteId: draftId,
    planId: planId as PlanId,
    bumpForever,
    amountCents,
    couponCode: coupon ?? null,
    email,
  });

  const charge = await createPixCharge({
    orderId: order.id,
    amountCents,
    email,
    description: "Revelado — página comemorativa",
  });

  await attachCharge(order.id, {
    providerRef: charge.providerRef,
    pixCode: charge.code,
    pixExpiresAt: charge.expiresAt,
  });

  return NextResponse.json(
    {
      orderId: order.id,
      amountCents,
      pix: {
        code: charge.code,
        expiresAt: charge.expiresAt.toISOString(),
        simulated: charge.simulated,
      },
    },
    { status: 201 },
  );
}
