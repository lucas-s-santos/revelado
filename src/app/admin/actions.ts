"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { grantFreeSite } from "@/lib/admin";
import { blockProps } from "@/lib/blocks/schema";
import { createCoupon, setCouponActive } from "@/lib/coupons";
import { PALETTE_IDS } from "@/lib/palettes";
import { PLAN_IDS } from "@/lib/plans";
import { ICON_IDS } from "@/lib/templates";
import { createTemplate, setTemplateActive } from "@/lib/templates-db";

const schema = z.object({
  slug: z.string().min(1, "Informe o link da página."),
  email: z.email("Confira o e-mail — parece que falta alguma coisa nele."),
  planId: z.enum(PLAN_IDS),
});

export interface GrantFormState {
  ok: boolean;
  message: string | null;
}

/**
 * Nunca confiar só no `admin/layout.tsx` para proteger isto: uma Server
 * Action é um endpoint próprio, alcançável direto — a checagem de sessão
 * entra de novo aqui (SPEC 12 anti-padrão 8 / CLAUDE.md regra 13, entrada
 * validada no servidor também).
 */
export async function grantFreeSiteAction(
  _prev: GrantFormState,
  formData: FormData,
): Promise<GrantFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    email: formData.get("email"),
    planId: formData.get("planId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const result = await grantFreeSite(parsed.data);
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin");
  return { ok: true, message: `Publicada: /p/${result.slug}` };
}

const couponSchema = z.object({
  code: z.string().min(3, "Use ao menos 3 letras.").max(32),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().int().positive(),
  validUntil: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
  maxUses: z.coerce.number().int().positive().optional(),
});

export interface CouponFormState {
  ok: boolean;
  message: string | null;
}

export async function createCouponAction(
  _prev: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    validUntil: formData.get("validUntil") || undefined,
    maxUses: formData.get("maxUses") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const result = await createCoupon({
    code: parsed.data.code,
    type: parsed.data.type,
    value: parsed.data.value,
    validUntil: parsed.data.validUntil,
    maxUses: parsed.data.maxUses ?? null,
  });

  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin");
  return { ok: true, message: `Cupom ${parsed.data.code} criado.` };
}

/** Sem `useActionState`: é um botão de alternar, não precisa de estado local. */
export async function toggleCouponAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id");
  const nextActive = formData.get("nextActive") === "true";
  if (typeof id !== "string" || !id) return;

  await setCouponActive(id, nextActive);
  revalidatePath("/admin");
}

const templateSchema = z.object({
  id: z.string().min(3, "Use ao menos 3 letras."),
  name: z.string().min(1, "Dê um nome ao template."),
  hint: z.string().max(120).optional(),
  icon: z.enum(ICON_IDS),
  previewUrl: z.string().max(300).optional(),
  planRequired: z.enum(PLAN_IDS).optional(),
  order: z.coerce.number().int().min(0),
  palette: z.enum(PALETTE_IDS),
  font: z.enum(["serif", "sans", "mixed"]),
  effect: z.enum(["none", "hearts", "confetti", "snow", "stars"]),
  blocks: z
    .string()
    .min(1, "Liste ao menos um bloco.")
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
});

export interface TemplateFormState {
  ok: boolean;
  message: string | null;
}

export async function createTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const parsed = templateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    hint: formData.get("hint") || undefined,
    icon: formData.get("icon"),
    previewUrl: formData.get("previewUrl") || undefined,
    planRequired: formData.get("planRequired") || undefined,
    order: formData.get("order"),
    palette: formData.get("palette"),
    font: formData.get("font"),
    effect: formData.get("effect"),
    blocks: formData.get("blocks"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const blocosDesconhecidos = parsed.data.blocks.filter(
    (block) => !(block in blockProps),
  );
  if (blocosDesconhecidos.length > 0) {
    return {
      ok: false,
      message: `Bloco desconhecido: ${blocosDesconhecidos.join(", ")}.`,
    };
  }

  const result = await createTemplate({
    id: parsed.data.id,
    name: parsed.data.name,
    hint: parsed.data.hint ?? "",
    icon: parsed.data.icon,
    previewUrl: parsed.data.previewUrl ?? "",
    planRequired: parsed.data.planRequired ?? null,
    order: parsed.data.order,
    preset: {
      palette: parsed.data.palette,
      font: parsed.data.font,
      effect: parsed.data.effect,
      blocks: parsed.data.blocks,
    },
  });

  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/admin");
  return { ok: true, message: `Template "${parsed.data.name}" criado.` };
}

/** Sem `useActionState`: é um botão de alternar, não precisa de estado local. */
export async function toggleTemplateAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id");
  const nextActive = formData.get("nextActive") === "true";
  if (typeof id !== "string" || !id) return;

  await setTemplateActive(id, nextActive);
  revalidatePath("/admin");
}
