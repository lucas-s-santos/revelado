import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPlan, PLANS, type PlanSeed } from "@/lib/plans";

/**
 * A metade de `lib/plans.ts` que fala com o banco — SPEC 8.9: admin edita
 * preço, prazo e vitrine sem deploy.
 *
 * Arquivo à parte pelo mesmo motivo de `lib/templates-db.ts`: `lib/plans.ts`
 * é importado por componentes de cliente (`pricing.tsx`, `checkout-form.tsx`,
 * `step-photos.tsx`) — juntar Prisma aqui levaria o cliente de banco para o
 * bundle do navegador, e a landing tem 1,7 KB de folga no orçamento (SPEC 10).
 *
 * Diferente de templates: aqui não existe `createPlan`. Os dois ids
 * ("simples", "especial") estão presos na grade de dois cards do checkout e
 * da vitrine — ver o comentário em `lib/plans.ts` sobre "ids antigos, nomes
 * novos". Admin **edita** os dois, não cria um terceiro.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

const featuresSchema = z.array(z.string()).min(1);

interface PlanRow {
  id: string;
  name: string;
  hint: string;
  priceCents: number;
  listCents: number;
  durationDays: number | null;
  maxPhotos: number;
  highlight: boolean;
  features: unknown;
  missing: unknown;
}

function rowToSeed(row: PlanRow): PlanSeed | null {
  const features = featuresSchema.safeParse(row.features);
  if (!features.success) {
    console.error(`[plans] features inválido em "${row.id}"`, features.error);
    return null;
  }

  const missing =
    row.missing === null || row.missing === undefined
      ? undefined
      : (featuresSchema.safeParse(row.missing).data ?? undefined);

  return {
    id: row.id as PlanSeed["id"],
    name: row.name,
    hint: row.hint,
    priceCents: row.priceCents,
    listCents: row.listCents,
    durationDays: row.durationDays,
    maxPhotos: row.maxPhotos,
    highlight: row.highlight,
    features: features.data,
    missing,
  };
}

/**
 * O que a vitrine e o checkout mostram — e, no checkout, o que se cobra.
 * Sem banco (dev sem Neon), cai nos dois de fábrica de `lib/plans.ts`.
 */
export async function listActivePlans(): Promise<PlanSeed[]> {
  if (!hasDatabase) return [...PLANS];

  const rows = await db.plan.findMany({ where: { active: true } });
  const seeds = rows.flatMap((row) => rowToSeed(row) ?? []);

  // A ordem importa para a grade (simples antes de especial) — o banco não
  // guarda posição, então a ordem vem de `PLAN_IDS`.
  return seeds.sort(
    (a, b) => PLANS.findIndex((p) => p.id === a.id) - PLANS.findIndex((p) => p.id === b.id),
  );
}

/**
 * Usado por `/api/checkout`: o preço que de fato se cobra vem daqui.
 * `null` também para plano desativado — igual a "não existe" para quem
 * chama, porque não dá para comprar um plano que o admin tirou de vitrine.
 */
export async function getPlanById(id: string): Promise<PlanSeed | null> {
  if (!hasDatabase) return getPlan(id) ?? null;

  const row = await db.plan.findUnique({ where: { id, active: true } });
  return row ? rowToSeed(row) : null;
}

export interface AdminPlanSummary extends PlanSeed {
  active: boolean;
}

/** Os dois, ativo ou não — só para a tela de admin. */
export async function listAllPlans(): Promise<AdminPlanSummary[]> {
  const rows = await db.plan.findMany({ orderBy: { priceCents: "asc" } });
  return rows.flatMap((row) => {
    const seed = rowToSeed(row);
    return seed ? [{ ...seed, active: row.active }] : [];
  });
}

export type PlanActionResult = { ok: true } | { ok: false; error: string };

export async function updatePlan(
  id: string,
  input: {
    priceCents: number;
    listCents: number;
    hint: string;
    highlight: boolean;
    active: boolean;
    features: string[];
    missing: string[];
  },
): Promise<PlanActionResult> {
  if (input.priceCents < 1) {
    return { ok: false, error: "O preço precisa ser maior que zero." };
  }
  if (input.listCents < input.priceCents) {
    return {
      ok: false,
      error: "O preço \"de\" precisa ser maior ou igual ao preço de venda.",
    };
  }
  if (input.features.length === 0) {
    return { ok: false, error: "Liste ao menos um recurso." };
  }

  try {
    await db.plan.update({
      where: { id },
      data: {
        priceCents: input.priceCents,
        listCents: input.listCents,
        hint: input.hint.trim(),
        highlight: input.highlight,
        active: input.active,
        features: input.features,
        missing: input.missing.length > 0 ? input.missing : Prisma.JsonNull,
      },
    });
  } catch {
    return { ok: false, error: "Não encontramos esse plano." };
  }

  return { ok: true };
}
