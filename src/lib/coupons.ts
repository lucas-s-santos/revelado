import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Cupons — SPEC 7.1 (`model Coupon`) e 8.5 e 8.9.
 *
 * Devolve `null` para cupom inexistente, vencido, esgotado ou desativado —
 * quem chama trata os quatro do mesmo jeito, porque a diferença não interessa
 * a quem digitou.
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
  if (!coupon.active) return null;

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

// --- admin (SPEC 8.9) ------------------------------------------------------

export interface CouponSummary {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  validUntil: Date | null;
  maxUses: number | null;
  uses: number;
}

export async function listCoupons(): Promise<CouponSummary[]> {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    type: coupon.type === "percent" ? "percent" : "fixed",
    value: coupon.value,
    active: coupon.active,
    validUntil: coupon.validUntil,
    maxUses: coupon.maxUses,
    uses: coupon.uses,
  }));
}

export type CreateCouponResult = { ok: true } | { ok: false; error: string };

export async function createCoupon(input: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  validUntil?: Date | null;
  maxUses?: number | null;
}): Promise<CreateCouponResult> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Informe um código." };

  if (input.type === "percent" && (input.value < 1 || input.value > 100)) {
    return { ok: false, error: "Percentual precisa ficar entre 1 e 100." };
  }
  if (input.type === "fixed" && input.value < 1) {
    return { ok: false, error: "Valor fixo precisa ser maior que zero." };
  }

  try {
    await db.coupon.create({
      data: {
        code,
        type: input.type,
        value: input.value,
        validUntil: input.validUntil ?? null,
        maxUses: input.maxUses ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Já existe um cupom com esse código." };
    }
    throw error;
  }

  return { ok: true };
}

/** Sem exclusão: desativar preserva o histórico dos pedidos que já usaram. */
export async function setCouponActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db.coupon.update({ where: { id }, data: { active } }).catch(() => {});
}
