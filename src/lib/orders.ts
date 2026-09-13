import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@/lib/db";
import { devPath } from "@/lib/dev-store";
import type { PlanId } from "@/lib/plans";

/**
 * Pedidos — SPEC 7.1 e 8.5.
 *
 * A regra que manda em tudo aqui: **o webhook é a única fonte de verdade do
 * pagamento** (anti-padrão 6). Nada nesta camada publica página por conta
 * própria; quem publica é a transição para `PAID`, e só ela.
 *
 * Mesmo esquema de backend duplo do `lib/drafts.ts`: Prisma quando há banco,
 * arquivo em `.drafts/orders/` quando não há, para o fluxo ser testável sem
 * Neon nem conta no Mercado Pago.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

export type OrderStatus =
  "PENDING" | "PAID" | "REFUNDED" | "FAILED" | "EXPIRED";

export interface Order {
  id: string;
  siteId: string;
  planId: PlanId;
  bumpForever: boolean;
  amountCents: number;
  couponCode: string | null;
  email: string;
  status: OrderStatus;
  provider: string;
  /** id da cobrança no provedor — a chave de idempotência do webhook */
  providerRef: string | null;
  /** dados do Pix, quando é Pix */
  pixCode: string | null;
  pixExpiresAt: Date | null;
  /** quando o aviso de carrinho abandonado saiu (SPEC 9.2) */
  abandonedNotifiedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreateOrderInput {
  siteId: string;
  planId: PlanId;
  bumpForever: boolean;
  amountCents: number;
  couponCode?: string | null;
  email: string;
}

// --- backend de arquivo (dev) --------------------------------------------

type DevOrder = Omit<
  Order,
  "paidAt" | "createdAt" | "pixExpiresAt" | "abandonedNotifiedAt"
> & {
  paidAt: string | null;
  createdAt: string;
  pixExpiresAt: string | null;
  abandonedNotifiedAt?: string | null;
};

const toOrder = (record: DevOrder): Order => ({
  ...record,
  paidAt: record.paidAt ? new Date(record.paidAt) : null,
  pixExpiresAt: record.pixExpiresAt ? new Date(record.pixExpiresAt) : null,
  // Pedidos criados antes desta coluna existir não têm a chave.
  abandonedNotifiedAt: record.abandonedNotifiedAt
    ? new Date(record.abandonedNotifiedAt)
    : null,
  createdAt: new Date(record.createdAt),
});

async function devWrite(record: DevOrder): Promise<void> {
  await mkdir(devPath("orders"), { recursive: true });
  await writeFile(
    join(devPath("orders"), `${record.id}.json`),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

async function devRead(id: string): Promise<DevOrder | null> {
  try {
    return JSON.parse(
      await readFile(join(devPath("orders"), `${id}.json`), "utf8"),
    ) as DevOrder;
  } catch {
    return null;
  }
}

async function devAll(): Promise<DevOrder[]> {
  try {
    const files = await readdir(devPath("orders"));
    const records = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) => devRead(file.replace(/\.json$/, ""))),
    );
    return records.filter((record): record is DevOrder => record !== null);
  } catch {
    return [];
  }
}

// --- API pública ----------------------------------------------------------

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const record: DevOrder = {
    id: randomUUID(),
    siteId: input.siteId,
    planId: input.planId,
    bumpForever: input.bumpForever,
    amountCents: input.amountCents,
    couponCode: input.couponCode ?? null,
    email: input.email,
    status: "PENDING",
    provider: "mercadopago",
    providerRef: null,
    pixCode: null,
    pixExpiresAt: null,
    abandonedNotifiedAt: null,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };

  if (!hasDatabase) {
    await devWrite(record);
    return toOrder(record);
  }

  // Com banco, o Order exige um User: a conta nasce aqui, no checkout (SPEC 1).
  const user = await db.user.upsert({
    where: { email: input.email },
    update: {},
    create: { email: input.email },
  });

  // O cupom vira vínculo, não texto solto: é o que permite consumir o uso
  // quando o pagamento confirma e saber depois qual cupom trouxe qual venda
  // (SPEC 7.1, model Coupon).
  const coupon = input.couponCode
    ? await db.coupon.findUnique({
        where: { code: input.couponCode.trim().toUpperCase() },
        select: { id: true },
      })
    : null;

  const order = await db.order.create({
    data: {
      id: record.id,
      userId: user.id,
      siteId: input.siteId,
      planId: input.planId,
      bumpForever: input.bumpForever,
      amountCents: input.amountCents,
      couponId: coupon?.id ?? null,
    },
  });

  // A página vira PENDING_PAYMENT só se ainda não estiver no ar.
  //
  // Numa renovação ela **está** no ar, e mudar o status tiraria do ar uma página
  // que está funcionando durante os trinta minutos do Pix — o presente sairia do
  // ar justamente porque a pessoa decidiu pagar para ele continuar.
  const site = await db.site.findUnique({
    where: { id: input.siteId },
    select: { status: true },
  });

  await db.site.update({
    where: { id: input.siteId },
    data: {
      userId: user.id,
      ...(site?.status === "PUBLISHED" ? {} : { status: "PENDING_PAYMENT" }),
    },
  });

  return { ...toOrder(record), id: order.id };
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!hasDatabase) {
    const record = await devRead(id);
    return record ? toOrder(record) : null;
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      coupon: { select: { code: true } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    siteId: order.siteId,
    planId: order.planId as PlanId,
    bumpForever: order.bumpForever,
    amountCents: order.amountCents,
    couponCode: order.coupon?.code ?? null,
    email: order.user.email,
    status: order.status,
    provider: order.provider,
    providerRef: order.providerRef,
    pixCode: order.pixCode,
    pixExpiresAt: order.pixExpiresAt,
    abandonedNotifiedAt: order.abandonedNotifiedAt,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  };
}

/** Guarda a referência da cobrança criada no provedor. */
export async function attachCharge(
  id: string,
  charge: { providerRef: string; pixCode?: string; pixExpiresAt?: Date },
): Promise<void> {
  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return;

    await devWrite({
      ...record,
      providerRef: charge.providerRef,
      pixCode: charge.pixCode ?? null,
      pixExpiresAt: charge.pixExpiresAt?.toISOString() ?? null,
    });
    return;
  }

  await db.order.update({
    where: { id },
    data: {
      providerRef: charge.providerRef,
      pixCode: charge.pixCode ?? null,
      pixExpiresAt: charge.pixExpiresAt ?? null,
    },
  });
}

export async function findByProviderRef(
  providerRef: string,
): Promise<Order | null> {
  if (!hasDatabase) {
    const all = await devAll();
    const record = all.find((order) => order.providerRef === providerRef);
    return record ? toOrder(record) : null;
  }

  const order = await db.order.findUnique({ where: { providerRef } });
  return order ? getOrder(order.id) : null;
}

/**
 * Transição de status. **Idempotente**: aplicar o mesmo estado duas vezes não
 * faz nada, que é o comportamento que o webhook precisa (SPEC 9.1).
 *
 * Devolve `changed: false` quando nada mudou — é assim que quem chama sabe se
 * deve disparar os efeitos colaterais (publicar, mandar e-mail) ou ficar quieto.
 */
export async function transitionOrder(
  id: string,
  status: OrderStatus,
): Promise<{ order: Order | null; changed: boolean }> {
  const current = await getOrder(id);
  if (!current) return { order: null, changed: false };
  if (current.status === status) return { order: current, changed: false };

  // PAID é terminal para efeitos de publicação; só reembolso sai de lá.
  if (current.status === "PAID" && status !== "REFUNDED") {
    return { order: current, changed: false };
  }

  const paidAt = status === "PAID" ? new Date() : current.paidAt;

  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return { order: null, changed: false };

    const updated: DevOrder = {
      ...record,
      status,
      paidAt: paidAt?.toISOString() ?? null,
    };
    await devWrite(updated);
    return { order: toOrder(updated), changed: true };
  }

  const updated = await db.order.update({
    where: { id },
    data: { status, paidAt },
  });

  return { order: await getOrder(updated.id), changed: true };
}

/** Pedidos de um e-mail — a base do painel enquanto não há login. */
export async function listOrdersByEmail(email: string): Promise<Order[]> {
  if (!hasDatabase) {
    const all = await devAll();
    return all
      .filter((order) => order.email === email)
      .map(toOrder)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const orders = await db.order.findMany({
    where: { user: { email } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const resolved = await Promise.all(orders.map((order) => getOrder(order.id)));
  return resolved.filter((order): order is Order => order !== null);
}

/**
 * E-mail de quem pagou por um site.
 *
 * Sem login ainda, o dono de uma página publicada é quem pagou por ela. Mora
 * aqui e não em `lib/views.ts` porque a resposta está no pedido — e agora três
 * lugares precisam dela: a notificação de primeira visita, o aviso de expiração
 * e o de carrinho abandonado.
 */
export async function ownerEmailForSite(
  siteId: string,
): Promise<string | null> {
  if (hasDatabase) {
    const order = await db.order.findFirst({
      where: { siteId, status: "PAID" },
      include: { user: { select: { email: true } } },
    });
    return order?.user.email ?? null;
  }

  const all = await devAll();
  return (
    all.find((order) => order.siteId === siteId && order.status === "PAID")
      ?.email ?? null
  );
}

/**
 * Pedidos parados no Pix — SPEC 9.2 (`order.abandoned`).
 *
 * "Carrinho abandonado, 30 minutos depois, com link de volta" (SPEC 8.5). Pega
 * só quem ainda não recebeu o aviso: uma pessoa que desistiu não precisa ser
 * lembrada disso todo dia.
 */
export async function listAbandoned(
  olderThanMs: number,
  now = new Date(),
  take = 100,
): Promise<Order[]> {
  const limite = new Date(now.getTime() - olderThanMs);

  if (!hasDatabase) {
    const all = await devAll();
    return all
      .map(toOrder)
      .filter(
        (order) =>
          order.status === "PENDING" &&
          order.abandonedNotifiedAt === null &&
          order.createdAt.getTime() <= limite.getTime(),
      )
      .slice(0, take);
  }

  const orders = await db.order.findMany({
    where: {
      status: "PENDING",
      abandonedNotifiedAt: null,
      createdAt: { lte: limite },
    },
    orderBy: { createdAt: "asc" },
    take,
  });

  const resolved = await Promise.all(orders.map((order) => getOrder(order.id)));
  return resolved.filter((order): order is Order => order !== null);
}

/** Marca o aviso como enviado, para ele não sair duas vezes. */
export async function markAbandonedNotified(
  id: string,
  at = new Date(),
): Promise<void> {
  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return;
    await devWrite({ ...record, abandonedNotifiedAt: at.toISOString() });
    return;
  }

  await db.order.update({
    where: { id },
    data: { abandonedNotifiedAt: at },
  });
}
