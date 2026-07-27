import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Mercado Pago — SPEC 2, 8.5 e 9.1.
 *
 * Duas coisas que o SPEC trata como não negociáveis e estão codificadas aqui:
 *  - **o webhook é a única fonte de verdade** do pagamento (anti-padrão 6).
 *    Nada nesta camada marca pedido como pago; ela só cria cobrança e traduz
 *    notificação;
 *  - **idempotência por `providerRef`**: a mesma notificação chega várias vezes,
 *    e chegar de novo não pode publicar duas vezes nem mandar dois e-mails.
 *
 * Sem `MERCADOPAGO_ACCESS_TOKEN`, entra um **simulador local** que devolve uma
 * cobrança Pix falsa e aceita confirmação manual. É o que permite rodar o e2e do
 * funil — pago, pendente, expirado, reembolsado — sem conta no Mercado Pago.
 */

export const MP_CONFIGURED = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

/** Pix do Mercado Pago expira em 30 minutos por padrão. */
const PIX_TTL_MINUTES = 30;

export interface PixCharge {
  providerRef: string;
  /** copia-e-cola */
  code: string;
  expiresAt: Date;
  /** true quando veio do simulador */
  simulated: boolean;
}

export interface CreateChargeInput {
  orderId: string;
  amountCents: number;
  email: string;
  description: string;
}

export async function createPixCharge(
  input: CreateChargeInput,
): Promise<PixCharge> {
  const expiresAt = new Date(Date.now() + PIX_TTL_MINUTES * 60_000);

  if (!MP_CONFIGURED) {
    return {
      providerRef: `sim_${input.orderId}`,
      code: simulatedPixCode(input),
      expiresAt,
      simulated: true,
    };
  }

  const { MercadoPagoConfig, Payment } = await import("mercadopago");

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  });

  const payment = await new Payment(client).create({
    body: {
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.email },
      date_of_expiration: expiresAt.toISOString(),
      external_reference: input.orderId,
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
    },
    // Idempotência na criação: um clique duplo não vira duas cobranças.
    requestOptions: { idempotencyKey: `order-${input.orderId}` },
  });

  const code =
    payment.point_of_interaction?.transaction_data?.qr_code ??
    payment.point_of_interaction?.transaction_data?.qr_code_base64 ??
    "";

  return {
    providerRef: String(payment.id),
    code,
    expiresAt,
    simulated: false,
  };
}

/**
 * Código Pix falso, no formato EMV do de verdade, para o simulador ter algo
 * copiável na tela. **Não é cobrável** — o prefixo diz isso em letras.
 */
function simulatedPixCode(input: CreateChargeInput): string {
  const amount = (input.amountCents / 100).toFixed(2);
  return `00020126SIMULADO-NAO-COBRAVEL5204000053039865802BR5907Revelado6009SAO PAULO54${String(amount.length).padStart(2, "0")}${amount}62${input.orderId.slice(0, 8)}6304${randomUUID().slice(0, 4).toUpperCase()}`;
}

export type NotificationStatus =
  "PAID" | "PENDING" | "REFUNDED" | "FAILED" | "EXPIRED";

export interface Notification {
  providerRef: string;
  status: NotificationStatus;
}

/** Status do Mercado Pago → o nosso. Tudo que não conhecemos vira PENDING. */
export function mapPaymentStatus(status: string): NotificationStatus {
  switch (status) {
    case "approved":
    case "authorized":
      return "PAID";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "rejected":
      return "FAILED";
    case "cancelled":
      return "EXPIRED";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "PENDING";
    default:
      // Status novo do provedor não pode virar "pago" por engano.
      return "PENDING";
  }
}

/** Consulta o pagamento no provedor — o webhook só traz o id, não o estado. */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<NotificationStatus | null> {
  if (!MP_CONFIGURED) return null;

  const { MercadoPagoConfig, Payment } = await import("mercadopago");
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  });

  try {
    const payment = await new Payment(client).get({ id: paymentId });
    return payment.status ? mapPaymentStatus(payment.status) : null;
  } catch {
    return null;
  }
}

/**
 * Assinatura do webhook (header `x-signature`).
 *
 * Sem segredo configurado, aceita — é o modo local. Com segredo, **exige**:
 * webhook de pagamento sem verificação é porta aberta para alguém publicar
 * página de graça.
 */
export function verifySignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim() ?? "", value?.trim() ?? ""];
    }),
  );

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(hash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
