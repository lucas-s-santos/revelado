"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { grantFreeSite } from "@/lib/admin";
import { PLAN_IDS } from "@/lib/plans";

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

  return { ok: true, message: `Publicada: /p/${result.slug}` };
}
