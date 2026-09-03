import { Prisma } from "@prisma/client";
import { z } from "zod";

import { blockProps, type BlockType } from "@/lib/blocks/schema";
import { db } from "@/lib/db";
import { PALETTE_IDS } from "@/lib/palettes";
import {
  getTemplate,
  ICON_IDS,
  TEMPLATES,
  type TemplateSeed,
} from "@/lib/templates";

/**
 * A metade de `lib/templates.ts` que fala com o banco — SPEC 8.9: admin cria
 * template novo sem deploy.
 *
 * Em arquivo separado de propósito: `Prisma`/`db`/`zod` aqui dentro, e
 * `step-format.tsx` ("use client") importa só `lib/templates.ts` — que não
 * tem nenhum dos três. Juntar os dois module levava o cliente de banco para o
 * bundle do navegador só porque um componente de cliente precisa de
 * `isTemplateReady`.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

function isBlockType(value: string): value is BlockType {
  return value in blockProps;
}

/**
 * Validado na escrita (aqui), confiado na leitura — mesmo acordo que
 * `lib/coupons.ts` já usa. O JSON só chega ao banco através de
 * `createTemplate`, que passa por aqui primeiro.
 */
const presetSchema = z.object({
  palette: z.enum(PALETTE_IDS),
  font: z.enum(["serif", "sans", "mixed"]),
  effect: z.enum(["none", "hearts", "confetti", "snow", "stars"]),
  blocks: z
    .array(z.string())
    .min(1, "A moldura precisa de ao menos um bloco.")
    .refine((blocks) => blocks.every(isBlockType), {
      message: "Tem um bloco nessa lista que o schema não conhece.",
    }) as z.ZodType<BlockType[]>,
});

interface TemplateRow {
  id: string;
  name: string;
  hint: string;
  icon: string;
  previewUrl: string;
  preset: unknown;
  planRequired: string | null;
  order: number;
}

/** `null` quando o `preset` gravado não bate mais com o schema atual. */
function rowToSeed(row: TemplateRow): TemplateSeed | null {
  const preset = presetSchema.safeParse(row.preset);
  if (!preset.success) {
    console.error(`[templates] preset inválido em "${row.id}"`, preset.error);
    return null;
  }

  const icon = (ICON_IDS as readonly string[]).includes(row.icon)
    ? (row.icon as TemplateSeed["icon"])
    : "heart";

  return {
    id: row.id,
    name: row.name,
    hint: row.hint,
    icon,
    previewUrl: row.previewUrl,
    planRequired: row.planRequired,
    order: row.order,
    preset: preset.data,
  };
}

/**
 * O que o editor oferece — SPEC 8.3. Sem banco (dev sem Neon), cai nos cinco
 * de fábrica de `lib/templates.ts`, para o editor continuar montável.
 */
export async function listActiveTemplates(): Promise<TemplateSeed[]> {
  if (!hasDatabase) {
    return [...TEMPLATES].sort((a, b) => a.order - b.order);
  }

  const rows = await db.template.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return rows.flatMap((row) => rowToSeed(row) ?? []);
}

/** Usado por `startDraft` e `/api/drafts` só para validar que o id existe. */
export async function getTemplateById(
  id: string,
): Promise<TemplateSeed | null> {
  if (!hasDatabase) return getTemplate(id) ?? null;

  const row = await db.template.findUnique({ where: { id } });
  return row ? rowToSeed(row) : null;
}

export interface AdminTemplateSummary extends TemplateSeed {
  active: boolean;
}

/** Todos, ativos e desativados — só para a tela de admin. */
export async function listAllTemplates(): Promise<AdminTemplateSummary[]> {
  const rows = await db.template.findMany({ orderBy: { order: "asc" } });
  return rows.flatMap((row) => {
    const seed = rowToSeed(row);
    return seed ? [{ ...seed, active: row.active }] : [];
  });
}

export type TemplateActionResult = { ok: true } | { ok: false; error: string };

export async function createTemplate(input: {
  id: string;
  name: string;
  hint: string;
  icon: string;
  previewUrl: string;
  planRequired: string | null;
  order: number;
  preset: unknown;
}): Promise<TemplateActionResult> {
  const id = input.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (id.length < 3) {
    return { ok: false, error: "Use um identificador com ao menos 3 letras." };
  }
  if (!input.name.trim()) {
    return { ok: false, error: "Dê um nome ao template." };
  }

  const preset = presetSchema.safeParse(input.preset);
  if (!preset.success) {
    return {
      ok: false,
      error: preset.error.issues[0]?.message ?? "Preset inválido.",
    };
  }

  const icon = (ICON_IDS as readonly string[]).includes(input.icon)
    ? input.icon
    : "heart";

  try {
    await db.template.create({
      data: {
        id,
        name: input.name.trim(),
        hint: input.hint.trim(),
        icon,
        previewUrl: input.previewUrl.trim() || "/templates/essencial.webp",
        planRequired: input.planRequired,
        order: input.order,
        preset: preset.data,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "Já existe um template com esse identificador.",
      };
    }
    throw error;
  }

  return { ok: true };
}

/** Sem exclusão: desativar preserva páginas antigas que usam este template. */
export async function setTemplateActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db.template.update({ where: { id }, data: { active } }).catch(() => {});
}
