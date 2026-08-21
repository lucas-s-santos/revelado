import { NextResponse } from "next/server";

import {
  fetchPayment,
  mapPaymentStatus,
  MP_CONFIGURED,
  verifySignature,
  type NotificationStatus,
} from "@/lib/mercadopago";
import {
  attachCharge,
  findByProviderRef,
  getOrder,
  transitionOrder,
  type Order,
} from "@/lib/orders";
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
 *
 * Dois caminhos para achar o pedido, porque há dois meios de pagamento:
 *  - **Pix**: a cobrança nasce no nosso servidor, então o `providerRef` já é o
 *    id do pagamento e a busca é direta;
 *  - **cartão**: o `providerRef` guardado é o id da *preferência*, e o
 *    pagamento só ganha id quando a pessoa paga. Aí o caminho é o
 *    `external_reference`, que carrega o id do pedido. Assim que resolve, o
 *    id real do pagamento é gravado — da segunda notificação em diante a busca
 *    volta a ser direta, e a idempotência por `providerRef` continua valendo.
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

  const resolved = await resolveOrder(dataId, body);
  if (!resolved.order) {
    // Pedido desconhecido: pode ser de outro ambiente compartilhando o mesmo
    // webhook. 200 para não gerar fila de reenvio eterna.
    return NextResponse.json({ ok: true, ignored: "pedido desconhecido" });
  }

  const { order, status } = resolved;
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
 * Acha o pedido e o estado numa passada só.
 *
 * A consulta ao provedor é cara e traz as duas coisas, então fazer as duas
 * perguntas separadas custaria duas chamadas por notificação — e o Mercado Pago
 * reenvia bastante.
 *
 * O webhook traz o id, não o estado. Com token, pergunta ao provedor — nunca
 * confiar no corpo, que qualquer um poderia forjar. Sem token (modo local), usa
 * o `action` da própria notificação, que é o que o simulador manda.
 */
async function resolveOrder(
  paymentId: string,
  body: WebhookBody,
): Promise<{ order: Order | null; status: NotificationStatus | null }> {
  const direct = await findByProviderRef(paymentId);

  if (!MP_CONFIGURED) {
    // Modo local: sem provedor a quem perguntar, o simulador manda o estado no
    // próprio `action`, e o pedido é sempre achado pelo providerRef.
    const action = body.action ?? "";
    const status = action.startsWith("payment.")
      ? mapPaymentStatus(action.replace("payment.", ""))
      : null;
    return { order: direct, status };
  }

  const payment = await fetchPayment(paymentId);
  if (!payment) return { order: direct, status: null };

  if (direct) return { order: direct, status: payment.status };

  // Cartão: o providerRef guardado é o da preferência. Volta pelo pedido.
  const reference = payment.externalReference;
  if (!reference) return { order: null, status: payment.status };

  const order = await getOrder(reference);
  if (!order) return { order: null, status: payment.status };

  // Grava o id real do pagamento: a próxima notificação já cai no caminho
  // direto, e a idempotência por providerRef volta a valer.
  await attachCharge(order.id, { providerRef: paymentId });

  return { order, status: payment.status };
}
