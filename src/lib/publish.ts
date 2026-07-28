import { revalidateSite } from "@/lib/cache";
import { getDraft } from "@/lib/drafts";
import { db } from "@/lib/db";
import { sendPublishedEmail } from "@/lib/email";
import type { Order } from "@/lib/orders";
import { getPlan } from "@/lib/plans";
import { markDraftPublished } from "@/lib/publish-store";

/**
 * Publicação da página — SPEC 8.5 e 9.2 (`site.publish`).
 *
 * **Só é chamada pela transição para PAID**, e só quando ela de fato mudou algo
 * (anti-padrão 6: nunca publicar sem webhook confirmado; idempotência: nunca
 * publicar duas vezes).
 *
 * "Pagamento que confirma 2 dias depois publica normalmente" — por isso nada
 * aqui olha para o relógio do pedido.
 */

export interface PublishResult {
  slug: string;
  expiresAt: Date | null;
}

export async function publishSite(order: Order): Promise<PublishResult | null> {
  const draft = await getDraft(order.siteId);
  if (!draft) return null;

  const plan = getPlan(order.planId);
  if (!plan) return null;

  // Bump "para sempre" tira a validade; senão, conta a partir de agora.
  const lifetime = order.bumpForever || plan.durationDays === null;
  const expiresAt = lifetime
    ? null
    : new Date(Date.now() + plan.durationDays! * 24 * 60 * 60 * 1000);

  await markDraftPublished(order.siteId, expiresAt);

  if (process.env.DATABASE_URL) {
    await db.site.update({
      where: { id: order.siteId },
      data: { status: "PUBLISHED", publishedAt: new Date(), expiresAt },
    });
  }

  // Derruba o cache do slug (SPEC 8.8). Sem isto, quem tiver aberto o link
  // antes do pagamento confirmar continuaria vendo "página não encontrada" pela
  // duração inteira do ISR — no dia em que o presente ia ser entregue.
  revalidateSite(draft.slug);

  // O e-mail é o comprovante da compra: falhar aqui não pode desfazer a
  // publicação, que é o que a pessoa pagou. Erro vai para o log e para o Sentry.
  try {
    await sendPublishedEmail({
      to: order.email,
      slug: draft.slug,
      orderId: order.id,
    });
  } catch (error) {
    console.error(`[publish:${order.id}] e-mail falhou`, error);
  }

  return { slug: draft.slug, expiresAt };
}
