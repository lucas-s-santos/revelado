"use server";

import { redirect } from "next/navigation";

import { ensureAnonId } from "@/lib/anon";
import { defaultContent, DEFAULT_TEMPLATE } from "@/lib/blocks/defaults";
import { createDraft } from "@/lib/drafts";
import { getTemplate } from "@/lib/templates";

/**
 * Começar uma página — SPEC 8.2, sem o passo de escolher ocasião.
 *
 * É Server Action e não Server Component com `redirect` porque `ensureAnonId`
 * grava cookie, e no App Router só Action e Route Handler podem escrever. De
 * quebra sai de graça o que a gente queria: o botão é um `form`, funciona sem
 * JavaScript e nenhum robô cria rascunho só por passar na URL.
 */
export async function startDraft(formData?: FormData) {
  const requested = formData?.get("template");
  const template =
    typeof requested === "string" && getTemplate(requested)
      ? requested
      : DEFAULT_TEMPLATE;

  const anonId = await ensureAnonId();

  const draft = await createDraft({
    templateId: template,
    content: defaultContent(template),
    anonId,
  });

  // `redirect` lança — precisa ficar fora de try/catch para não ser engolido.
  redirect(`/editor/${draft.id}`);
}
