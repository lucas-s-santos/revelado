"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import {
  deleteSite,
  grantFreeSite,
  resendPublishedEmail,
  setSiteIndexable,
} from "@/lib/admin";
import { blockProps } from "@/lib/blocks/schema";
import { createCoupon, setCouponActive } from "@/lib/coupons";
import { renameDraftSlug } from "@/lib/drafts";
import { PALETTE_IDS } from "@/lib/palettes";
import { PLAN_IDS } from "@/lib/plans";
import { ICON_IDS } from "@/lib/templates";
import { createTemplate, setTemplateActive } from "@/lib/templates-db";
import { updatePlan } from "@/lib/plans-db";
import { moderateEntry } from "@/lib/guestbook";

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

  revalidatePath("/admin/paginas");
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

  revalidatePath("/admin/cupons");
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
  revalidatePath("/admin/cupons");
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

  revalidatePath("/admin/templates");
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
  revalidatePath("/admin/templates");
}

const planSchema = z.object({
  id: z.enum(PLAN_IDS),
  priceCents: z.coerce.number().int().positive(),
  listCents: z.coerce.number().int().positive(),
  hint: z.string().max(120).optional(),
  features: z
    .string()
    .min(1, "Liste ao menos um recurso.")
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  missing: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
});

export interface PlanFormState {
  ok: boolean;
  message: string | null;
}

/**
 * Sem `createPlan`: os dois ids estão presos na grade de dois cards do
 * checkout e da vitrine (ver o comentário em `lib/plans.ts`). Admin edita
 * preço, vitrine e ativo — nunca cria um terceiro plano.
 *
 * `revalidatePath("/")` é o que faz a landing (estática, ISR de 1h) mostrar o
 * preço novo na hora em vez de esperar a próxima hora — sem isso, "editável
 * sem deploy" seria "editável sem deploy, em até 60 minutos".
 */
export async function updatePlanAction(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const parsed = planSchema.safeParse({
    id: formData.get("id"),
    priceCents: formData.get("priceCents"),
    listCents: formData.get("listCents"),
    hint: formData.get("hint") || undefined,
    features: formData.get("features"),
    missing: formData.get("missing") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  if (parsed.data.listCents < parsed.data.priceCents) {
    return {
      ok: false,
      message: 'O preço "de" precisa ser maior ou igual ao preço de venda.',
    };
  }

  const result = await updatePlan(parsed.data.id, {
    priceCents: parsed.data.priceCents,
    listCents: parsed.data.listCents,
    hint: parsed.data.hint ?? "",
    highlight: formData.get("highlight") === "on",
    active: formData.get("active") === "on",
    features: parsed.data.features,
    missing: parsed.data.missing,
  });

  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/");
  revalidatePath("/admin/planos");
  return { ok: true, message: "Plano atualizado." };
}

/**
 * Fila de moderação do mural — SPEC 8.9. Aprovar marca `approved: true`;
 * rejeitar apaga (não existe "recado rejeitado" para guardar). Sem
 * `revalidatePath` na página publicada: `/p/[slug]` já não lê o mural do
 * cache de conteúdo (SPEC 8.8), e a leitura do mural aceita a mesma janela de
 * até 1h da ISR da rota — a mesma folga que o resto do conteúdo já tem.
 */
export async function moderateEntryAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id");
  const approve = formData.get("approve") === "true";
  if (typeof id !== "string" || !id) return;

  await moderateEntry(id, approve);
  revalidatePath("/admin/mural");
}

// --- Páginas (SPEC 8.9: busca de pedido, reenvio de e-mail) ----------------

/** Sem `useActionState`: é um botão de alternar, não precisa de estado local. */
export async function setIndexableAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id");
  const indexable = formData.get("indexable") === "true";
  if (typeof id !== "string" || !id) return;

  await setSiteIndexable(id, indexable);
  revalidatePath("/admin/paginas");
}

/**
 * Sem confirmação de duas etapas: é soft delete (SPEC 7.1, `deletedAt`) — a
 * linha continua no banco, só some das listas. Reversível direto no banco se
 * precisar, então não pede o teatro de "digite EXCLUIR para confirmar".
 */
export async function deleteSiteAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return;

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await deleteSite(id);
  revalidatePath("/admin/paginas");
  revalidatePath("/admin");
}

export interface ResendFormState {
  ok: boolean;
  message: string | null;
}

export async function resendEmailAction(
  _prev: ResendFormState,
  formData: FormData,
): Promise<ResendFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Página não encontrada." };
  }

  const result = await resendPublishedEmail(id);
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, message: "E-mail reenviado." };
}

const renameSchema = z.object({
  id: z.string().min(1),
  apelido: z.string().min(1, "Digite o novo começo do link."),
});

export interface RenameFormState {
  ok: boolean;
  message: string | null;
}

/**
 * Reusa `renameDraftSlug` — a mesma função do editor, com a mesma regra:
 * recusa em página já publicada (o QR já foi impresso, SPEC 7.1). Não existe
 * "forçar mesmo assim": mudar o link de uma página publicada quebraria todo
 * QR já entregue, admin ou não.
 */
export async function renameSiteSlugAction(
  _prev: RenameFormState,
  formData: FormData,
): Promise<RenameFormState> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { ok: false, message: "Sem acesso." };
  }

  const parsed = renameSchema.safeParse({
    id: formData.get("id"),
    apelido: formData.get("apelido"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const result = await renameDraftSlug(parsed.data.id, parsed.data.apelido);
  if (!result.ok) {
    const mensagens = {
      "not-found": "Página não encontrada.",
      published: "Página publicada não muda de link — o QR já foi impresso.",
      invalid: result.detail ?? "Link inválido.",
    };
    return { ok: false, message: mensagens[result.reason] };
  }

  revalidatePath("/admin/paginas");
  return { ok: true, message: `Novo link: /p/${result.draft.slug}` };
}
