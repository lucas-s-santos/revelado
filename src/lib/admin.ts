import { validateForPublish } from "@/lib/blocks/schema";
import { db, notDeleted } from "@/lib/db";
import { findDraftBySlug } from "@/lib/drafts";
import { sendPublishedEmail } from "@/lib/email";
import { createOrder, transitionOrder } from "@/lib/orders";
import { getPlan, type PlanId } from "@/lib/plans";
import { publishSite } from "@/lib/publish";

/**
 * `/admin` — SPEC 8.9, só o recorte que a Fase 5 precisa: números do negócio
 * e conceder página de graça. O resto do SPEC 8.9 (funil, CRUD de templates,
 * moderação, cupons, reembolso) é Fase 7 — SPEC seção 13.
 */

export interface AdminStats {
  totalUsers: number;
  totalSites: number;
  publishedSites: number;
  paidOrders: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [totalUsers, totalSites, publishedSites, paidOrders] =
    await Promise.all([
      db.user.count(),
      db.site.count({ where: notDeleted }),
      db.site.count({ where: { ...notDeleted, status: "PUBLISHED" } }),
      db.order.count({ where: { status: "PAID" } }),
    ]);

  return { totalUsers, totalSites, publishedSites, paidOrders };
}

export interface AdminSiteSummary {
  id: string;
  slug: string;
  status: string;
  indexable: boolean;
  createdAt: Date;
  ownerEmail: string | null;
}

/** As últimas páginas criadas, para o admin achar o que procura sem SQL. */
export async function listRecentSites(limit = 30): Promise<AdminSiteSummary[]> {
  return searchSites(undefined, limit);
}

/**
 * Busca por link ou e-mail do dono — SPEC 8.9 "busca de pedido". Sem termo,
 * é a mesma lista de "últimas páginas" de antes.
 */
export async function searchSites(
  query?: string,
  limit = 30,
): Promise<AdminSiteSummary[]> {
  const termo = query?.trim();

  const sites = await db.site.findMany({
    where: {
      ...notDeleted,
      ...(termo
        ? {
            OR: [
              { slug: { contains: termo, mode: "insensitive" } },
              { user: { email: { contains: termo, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      status: true,
      indexable: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return sites.map((site) => ({
    id: site.id,
    slug: site.slug,
    status: site.status,
    indexable: site.indexable,
    createdAt: site.createdAt,
    ownerEmail: site.user?.email ?? null,
  }));
}

/** Soft delete (SPEC 7.1) — a página some das listas, a linha continua no banco. */
export async function deleteSite(id: string): Promise<void> {
  await db.site
    .update({ where: { id }, data: { deletedAt: new Date() } })
    .catch(() => {});
}

export async function setSiteIndexable(
  id: string,
  indexable: boolean,
): Promise<void> {
  await db.site.update({ where: { id }, data: { indexable } }).catch(() => {});
}

export type ResendEmailResult = { ok: true } | { ok: false; error: string };

/** Reenvia o e-mail "sua página está no ar" — SPEC 8.9 "reenvio de e-mail". */
export async function resendPublishedEmail(
  siteId: string,
): Promise<ResendEmailResult> {
  const order = await db.order.findFirst({
    where: { siteId, status: "PAID" },
    orderBy: { paidAt: "desc" },
    include: { user: { select: { email: true } }, site: { select: { slug: true } } },
  });

  if (!order) {
    return { ok: false, error: "Essa página não tem pedido pago." };
  }

  await sendPublishedEmail({
    to: order.user.email,
    slug: order.site.slug,
    orderId: order.id,
  });

  return { ok: true };
}

export interface RevenueStats {
  totalCents: number;
  last30dCents: number;
  byPlan: { planId: string; planName: string; orders: number; cents: number }[];
}

/** SPEC 8.9 "receita por plano" — só o que já foi de fato pago. */
export async function getRevenueStats(): Promise<RevenueStats> {
  const paid = await db.order.findMany({
    where: { status: "PAID" },
    select: { amountCents: true, paidAt: true, planId: true, plan: { select: { name: true } } },
  });

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const totalCents = paid.reduce((total, order) => total + order.amountCents, 0);
  const last30dCents = paid
    .filter((order) => order.paidAt && order.paidAt >= trintaDiasAtras)
    .reduce((total, order) => total + order.amountCents, 0);

  const porPlano = new Map<string, { planName: string; orders: number; cents: number }>();
  for (const order of paid) {
    const atual = porPlano.get(order.planId) ?? {
      planName: order.plan.name,
      orders: 0,
      cents: 0,
    };
    atual.orders += 1;
    atual.cents += order.amountCents;
    porPlano.set(order.planId, atual);
  }

  return {
    totalCents,
    last30dCents,
    byPlan: [...porPlano.entries()]
      .map(([planId, v]) => ({ planId, planName: v.planName, orders: v.orders, cents: v.cents }))
      .sort((a, b) => b.cents - a.cents),
  };
}

export type GrantFreeSiteResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Concede uma página sem cobrar — mesma sequência que o webhook do Mercado
 * Pago percorre quando um pagamento confirma (`createOrder` → `PAID` →
 * `publishSite`), só que disparada pelo admin em vez do provedor. Continua
 * verdade que "nenhuma página publica fora da transição para PAID"
 * (CLAUDE.md regra 7): aqui o `Order` existe, com `amountCents: 0` e
 * `provider: "admin"` — visível e auditável, nunca um atalho silencioso.
 */
export async function grantFreeSite(input: {
  slug: string;
  email: string;
  planId: PlanId;
}): Promise<GrantFreeSiteResult> {
  if (!getPlan(input.planId)) {
    return { ok: false, error: "Plano desconhecido." };
  }

  const draft = await findDraftBySlug(input.slug);
  if (!draft) {
    return { ok: false, error: "Não encontramos uma página com esse link." };
  }
  if (draft.status === "PUBLISHED") {
    return { ok: false, error: "Essa página já está publicada." };
  }

  const issues = validateForPublish(draft.content);
  if (issues.length > 0) {
    return { ok: false, error: issues[0]?.message ?? "Página incompleta." };
  }

  const order = await createOrder({
    siteId: draft.id,
    planId: input.planId,
    bumpForever: false,
    amountCents: 0,
    email: input.email,
    provider: "admin",
  });

  const { order: updated, changed } = await transitionOrder(order.id, "PAID");
  if (!changed || !updated) {
    return { ok: false, error: "Não deu para confirmar o pedido." };
  }

  const published = await publishSite(updated);
  if (!published) {
    return { ok: false, error: "Não deu para publicar. Tente de novo." };
  }

  return { ok: true, slug: published.slug };
}
