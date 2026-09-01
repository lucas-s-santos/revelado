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
 * cobrança falsa e aceita confirmação manual. É o que permite rodar o e2e do
 * funil — pago, pendente, expirado, reembolsado — sem conta no Mercado Pago.
 *
 * Dois meios, dois formatos de cobrança:
 *  - **Pix** cria um `Payment` direto, e a gente já sai sabendo o id dele;
 *  - **cartão** cria uma `Preference` e manda a pessoa para o Checkout Pro.
 *    Nenhum dado de cartão passa pelo nosso servidor — é o que nos mantém fora
 *    do escopo de PCI. O preço disso é que o id do pagamento **só existe depois**
 *    que a pessoa paga, então o webhook precisa saber resolver o pedido pelo
 *    `external_reference` além do `providerRef` (ver a rota do webhook).
 */

export const MP_CONFIGURED = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

/**
 * O simulador de pagamento só pode existir no modo de desenvolvimento local.
 *
 * **Isto fecha um jeito de burlar o sistema.** Sem Mercado Pago, esta camada
 * simulava a cobrança e a `verifySignature` deixava passar sem segredo. Ótimo
 * para testar o funil sem conta — mas era *fail open*: num deploy de produção
 * que subisse sem as chaves, a segurança se desligava sozinha, e qualquer
 * pessoa, dona do próprio rascunho, forjava a notificação (`sim_<orderId>`,
 * previsível) e publicava **sem pagar**. Demonstrado de ponta a ponta.
 *
 * O sinal de "deploy real" é ter banco: um site de verdade persiste em
 * Postgres; o modo local guarda tudo em arquivo. Amarrar pagamento-real a
 * banco-presente é o que torna impossível ter pedido persistente publicado
 * por simulação — sem `DATABASE_URL`, é dev; com ele, pagamento é sempre de
 * verdade, e a falta de chave vira recusa (*fail closed*), nunca simulação.
 */
export const PAYMENTS_SIMULATED =
  !MP_CONFIGURED && !process.env.DATABASE_URL;

/** Lançado quando um deploy real tenta cobrar sem o Mercado Pago configurado. */
export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Pagamento indisponível: Mercado Pago não configurado neste ambiente.");
    this.name = "PaymentsNotConfiguredError";
  }
}

/**
 * Porta única entre "simular" e "cobrar de verdade".
 *
 * Só há dois caminhos válidos: simulação (dev, sem banco) ou provedor real
 * (chaves presentes). O terceiro — banco sem chaves — não pode virar
 * simulação nem cobrança silenciosa: ele PARA aqui.
 */
function assertRealOrSimulated(): void {
  if (!PAYMENTS_SIMULATED && !MP_CONFIGURED) {
    throw new PaymentsNotConfiguredError();
  }
}

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

  assertRealOrSimulated();
  if (PAYMENTS_SIMULATED) {
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

export interface CardCheckout {
  /** id da preferência — vira o providerRef até o pagamento existir */
  providerRef: string;
  /** para onde mandar a pessoa */
  url: string;
  simulated: boolean;
}

export interface CreateCardCheckoutInput extends CreateChargeInput {
  /** parcelas máximas já calculadas por `maxInstallments` */
  installments: number;
}

/**
 * Checkout Pro para cartão, parcelado.
 *
 * `external_reference` é o que amarra a preferência ao pedido: é por ele que o
 * webhook encontra o pedido quando o pagamento nasce, já que o id do pagamento
 * não existe neste momento.
 */
export async function createCardCheckout(
  input: CreateCardCheckoutInput,
): Promise<CardCheckout> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  assertRealOrSimulated();
  if (PAYMENTS_SIMULATED) {
    return {
      providerRef: `simpref_${input.orderId}`,
      // O simulador não sai do site: cai na mesma tela de sucesso, que já sabe
      // esperar o pedido virar PAID.
      url: `/sucesso/${input.orderId}?simulado=cartao`,
      simulated: true,
    };
  }

  const { MercadoPagoConfig, Preference } = await import("mercadopago");

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  });

  const preference = await new Preference(client).create({
    body: {
      items: [
        {
          id: input.orderId,
          title: input.description,
          quantity: 1,
          unit_price: input.amountCents / 100,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.email },
      external_reference: input.orderId,
      notification_url: `${site}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${site}/sucesso/${input.orderId}`,
        pending: `${site}/sucesso/${input.orderId}`,
        failure: `${site}/checkout/${input.orderId}`,
      },
      auto_return: "approved",
      payment_methods: {
        installments: input.installments,
        // Pix tem fluxo próprio nesta aplicação; aqui é a via do cartão.
        excluded_payment_types: [{ id: "bank_transfer" }, { id: "ticket" }],
      },
    },
    requestOptions: { idempotencyKey: `pref-${input.orderId}` },
  });

  const url = preference.init_point ?? preference.sandbox_init_point ?? "";

  return { providerRef: String(preference.id), url, simulated: false };
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

export interface FetchedPayment {
  status: NotificationStatus;
  /** o id do nosso pedido, que viajou na cobrança */
  externalReference: string | null;
}

/**
 * Consulta o pagamento no provedor — o webhook só traz o id, não o estado.
 *
 * Devolve também o `external_reference` porque no cartão ele é a única ponte
 * de volta até o pedido: a preferência foi criada antes de o pagamento existir.
 */
export async function fetchPayment(
  paymentId: string,
): Promise<FetchedPayment | null> {
  if (!MP_CONFIGURED) return null;

  const { MercadoPagoConfig, Payment } = await import("mercadopago");
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  });

  try {
    const payment = await new Payment(client).get({ id: paymentId });
    if (!payment.status) return null;

    return {
      status: mapPaymentStatus(payment.status),
      externalReference: payment.external_reference ?? null,
    };
  } catch {
    return null;
  }
}

/** Só o estado, para quem não precisa da referência. */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<NotificationStatus | null> {
  return (await fetchPayment(paymentId))?.status ?? null;
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
  // Sem segredo, a assinatura só é dispensada no modo simulado (dev sem banco).
  // Num deploy real, a falta do segredo é recusa, não licença: era este `return
  // true` que deixava o webhook forjado publicar sem pagar.
  if (!secret) return PAYMENTS_SIMULATED;
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
