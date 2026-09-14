import { revalidateSite } from "@/lib/cache";
import { consumeCoupon } from "@/lib/coupons";
import { clearExpiringNotice, getDraft } from "@/lib/drafts";
import { db } from "@/lib/db";
import { sendPublishedEmail, sendRenewedEmail } from "@/lib/email";
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
  /** true quando a página já estava no ar e o pagamento só esticou o prazo */
  renewed: boolean;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * O novo prazo da página.
 *
 * A regra que importa: **renovar cedo soma, não substitui.** Quem renova a
 * quinze dias do fim — que é exatamente o que o aviso de `site.expiring` pede —
 * não pode perder esses quinze dias por ter sido precavido. Se o e-mail manda
 * renovar antes e renovar antes custa tempo, o e-mail está pedindo para a pessoa
 * se prejudicar.
 *
 * Então a contagem parte do que for mais tarde: o prazo atual, se ainda estiver
 * valendo, ou agora. Página já expirada recomeça de hoje, que é o justo — o
 * tempo em que ela ficou fora do ar não era tempo de serviço.
 */
export function nextExpiry(input: {
  /** prazo atual; `null` em página nova ou vitalícia */
  current: Date | null;
  /** dias do plano; `null` = vitalício */
  durationDays: number | null;
  bumpForever: boolean;
  now?: Date;
}): Date | null {
  if (input.bumpForever || input.durationDays === null) return null;

  const now = input.now ?? new Date();
  const atual = input.current ? new Date(input.current) : null;

  const base =
    atual && atual.getTime() > now.getTime() ? atual.getTime() : now.getTime();

  return new Date(base + input.durationDays * DIA_MS);
}

export async function publishSite(order: Order): Promise<PublishResult | null> {
  const draft = await getDraft(order.siteId);
  if (!draft) return null;

  const plan = getPlan(order.planId);
  if (!plan) return null;

  // Já estava no ar: isto é renovação, não estreia (SPEC 8.7).
  const renewed = draft.status === "PUBLISHED";

  const expiresAt = nextExpiry({
    current: renewed ? draft.expiresAt : null,
    durationDays: plan.durationDays,
    bumpForever: order.bumpForever,
  });

  await markDraftPublished(order.siteId, expiresAt);

  if (process.env.DATABASE_URL) {
    await db.site.update({
      where: { id: order.siteId },
      data: { status: "PUBLISHED", publishedAt: new Date(), expiresAt },
    });
  }

  // O aviso de "vai expirar" precisa poder sair de novo no próximo ciclo: sem
  // limpar a marca, uma página renovada nunca mais seria avisada (SPEC 9.2).
  if (renewed) await clearExpiringNotice(order.siteId);

  // Derruba o cache do slug (SPEC 8.8). Sem isto, quem tiver aberto o link
  // antes do pagamento confirmar continuaria vendo "página não encontrada" pela
  // duração inteira do ISR — no dia em que o presente ia ser entregue.
  revalidateSite(draft.slug);

  // Cupom só gasta um uso quando o dinheiro entrou — nunca no checkout, senão
  // carrinho abandonado queima o estoque do cupom (SPEC 7.1, model Coupon).
  if (order.couponCode) await consumeCoupon(order.couponCode);

  // O e-mail é o comprovante da compra: falhar aqui não pode desfazer a
  // publicação, que é o que a pessoa pagou. Erro vai para o log e para o Sentry.
  try {
    if (renewed) {
      await sendRenewedEmail({
        to: order.email,
        slug: draft.slug,
        siteId: draft.id,
        expiresAt,
      });
    } else {
      await sendPublishedEmail({
        to: order.email,
        slug: draft.slug,
        orderId: order.id,
      });
    }
  } catch (error) {
    console.error(`[publish:${order.id}] e-mail falhou`, error);
  }

  return { slug: draft.slug, expiresAt, renewed };
}
