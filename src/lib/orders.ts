import { randomUUID } from "node:crypto";

import { devDir } from "@/lib/dev-store";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@/lib/db";
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
const DEV_DIR = devDir("orders");

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

type DevOrder = Omit<Order, "paidAt" | "createdAt" | "pixExpiresAt"> & {
  paidAt: string | null;
  createdAt: string;
  pixExpiresAt: string | null;
};

const toOrder = (record: DevOrder): Order => ({
  ...record,
  paidAt: record.paidAt ? new Date(record.paidAt) : null,
  pixExpiresAt: record.pixExpiresAt ? new Date(record.pixExpiresAt) : null,
  createdAt: new Date(record.createdAt),
});

async function devWrite(record: DevOrder): Promise<void> {
  await mkdir(DEV_DIR, { recursive: true });
  await writeFile(
    join(DEV_DIR, `${record.id}.json`),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

async function devRead(id: string): Promise<DevOrder | null> {
  try {
    return JSON.parse(
      await readFile(join(DEV_DIR, `${id}.json`), "utf8"),
    ) as DevOrder;
  } catch {
    return null;
  }
}

async function devAll(): Promise<DevOrder[]> {
  try {
    const files = await readdir(DEV_DIR);
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

  const order = await db.order.create({
    data: {
      id: record.id,
      userId: user.id,
      siteId: input.siteId,
      planId: input.planId,
      bumpForever: input.bumpForever,
      amountCents: input.amountCents,
    },
  });

  await db.site.update({
    where: { id: input.siteId },
    data: { userId: user.id, status: "PENDING_PAYMENT" },
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
    include: { user: { select: { email: true } } },
  });
  if (!order) return null;

  return {
    id: order.id,
    siteId: order.siteId,
    planId: order.planId as PlanId,
    bumpForever: order.bumpForever,
    amountCents: order.amountCents,
    couponCode: null,
    email: order.user.email,
    status: order.status,
    provider: order.provider,
    providerRef: order.providerRef,
    pixCode: null,
    pixExpiresAt: null,
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
    data: { providerRef: charge.providerRef },
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
