import { NextResponse } from "next/server";

import {
  fetchPaymentStatus,
  mapPaymentStatus,
  MP_CONFIGURED,
  verifySignature,
  type NotificationStatus,
} from "@/lib/mercadopago";
import { findByProviderRef, transitionOrder } from "@/lib/orders";
import { publishSite } from "@/lib/publish";

/**
 * Webhook do Mercado Pago — SPEC 9.1: **a única fonte de verdade** do pagamento.
 *
 * Regras que este arquivo existe para garantir:
 *  1. nenhuma página é publicada sem passar por aqui (anti-padrão 6);
 *  2. **idempotente por `providerRef`** — a mesma notificação chega várias
 *     vezes e só a primeira que muda o estado dispara os efeitos;
 *  3. responde 200 para tudo que foi entendido, mesmo sem ação. Devolver erro
 *     faz o Mercado Pago reenviar por horas sem motivo;
 *  4. "pagamento que confirma 2 dias depois publica normalmente" — nada aqui
 *     olha para a idade do pedido.
 */

export const dynamic = "force-dynamic";

interface WebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

export async function POST(request: Request) {
  const raw = await request.text();

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const dataId = body.data?.id ? String(body.data.id) : null;
  if (!dataId) {
    // Notificação sem id: entendida e ignorada, sem pedir reenvio.
    return NextResponse.json({ ok: true, ignored: "sem data.id" });
  }

  if (
    !verifySignature(
      request.headers.get("x-signature"),
      request.headers.get("x-request-id"),
      dataId,
    )
  ) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  // Só notificação de pagamento interessa; merchant_order e afins são ruído.
  const kind = body.type ?? body.action?.split(".")[0];
  if (kind && kind !== "payment") {
    return NextResponse.json({ ok: true, ignored: kind });
  }

  const order = await findByProviderRef(dataId);
  if (!order) {
    // Pedido desconhecido: pode ser de outro ambiente compartilhando o mesmo
    // webhook. 200 para não gerar fila de reenvio eterna.
    return NextResponse.json({ ok: true, ignored: "pedido desconhecido" });
  }

  const status = await resolveStatus(dataId, body);
  if (!status) {
    return NextResponse.json({ ok: true, ignored: "status indeterminado" });
  }

  const { order: updated, changed } = await transitionOrder(order.id, status);

  // Aqui está a idempotência: sem mudança de estado, nenhum efeito colateral.
  if (!changed || !updated) {
    return NextResponse.json({ ok: true, idempotent: true, status });
  }

  if (status === "PAID") {
    const published = await publishSite(updated);
    return NextResponse.json({
      ok: true,
      status,
      published: published?.slug ?? null,
    });
  }

  return NextResponse.json({ ok: true, status });
}

/**
 * O webhook traz o id, não o estado. Com token, pergunta ao provedor — nunca
 * confiar no corpo, que qualquer um poderia forjar. Sem token (modo local), usa
 * o `action` da própria notificação, que é o que o simulador manda.
 */
async function resolveStatus(
  paymentId: string,
  body: WebhookBody,
): Promise<NotificationStatus | null> {
  if (MP_CONFIGURED) return fetchPaymentStatus(paymentId);

  const action = body.action ?? "";
  if (action.startsWith("payment.")) {
    return mapPaymentStatus(action.replace("payment.", ""));
  }

  return null;
}
