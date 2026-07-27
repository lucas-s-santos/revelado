import { db } from "@/lib/db";

/**
 * Cupons — SPEC 7.1 (`model Coupon`) e 8.5.
 *
 * Devolve `null` para cupom inexistente, vencido ou esgotado — quem chama trata
 * os três do mesmo jeito, porque a diferença não interessa a quem digitou.
 *
 * Sem banco, funcionam os cupons de demonstração abaixo, para o checkout ser
 * testável de ponta a ponta.
 */

export interface Discount {
  type: "percent" | "fixed";
  value: number;
}

const DEMO_COUPONS: Record<string, Discount> = {
  PRIMEIRA: { type: "percent", value: 15 },
  AMIGO10: { type: "fixed", value: 1000 },
};

export async function applyCoupon(code: string): Promise<Discount | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (!process.env.DATABASE_URL) {
    return DEMO_COUPONS[normalized] ?? null;
  }

  const coupon = await db.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) return null;

  if (coupon.validUntil && coupon.validUntil.getTime() < Date.now())
    return null;
  if (coupon.maxUses !== null && coupon.uses >= coupon.maxUses) return null;

  return {
    type: coupon.type === "percent" ? "percent" : "fixed",
    value: coupon.value,
  };
}

/** Consome um uso. Chamado só quando o pagamento confirma, nunca antes. */
export async function consumeCoupon(code: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  await db.coupon
    .update({
      where: { code: code.trim().toUpperCase() },
      data: { uses: { increment: 1 } },
    })
    .catch(() => {
      // Cupom apagado entre a compra e a confirmação: não é motivo para
      // segurar a publicação de quem já pagou.
    });
}
