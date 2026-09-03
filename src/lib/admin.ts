import { validateForPublish } from "@/lib/blocks/schema";
import { db, notDeleted } from "@/lib/db";
import { findDraftBySlug } from "@/lib/drafts";
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
  createdAt: Date;
  ownerEmail: string | null;
}

/** As últimas páginas criadas, para o admin achar o que procura sem SQL. */
export async function listRecentSites(limit = 30): Promise<AdminSiteSummary[]> {
  const sites = await db.site.findMany({
    where: notDeleted,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return sites.map((site) => ({
    id: site.id,
    slug: site.slug,
    status: site.status,
    createdAt: site.createdAt,
    ownerEmail: site.user?.email ?? null,
  }));
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
