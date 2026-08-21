import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAnonId } from "@/lib/anon";
import { defaultContent, DEFAULT_TEMPLATE } from "@/lib/blocks/defaults";
import { createDraft } from "@/lib/drafts";
import { TEMPLATE_IDS } from "@/lib/templates";

/**
 * Cria um rascunho — SPEC 8.2: "cria um `Site` em DRAFT com `anonId` de cookie".
 *
 * Sem ocasião para escolher, o corpo virou opcional: `POST` sem nada já devolve
 * um rascunho no template essencial. É o que `/criar` usa para mandar a pessoa
 * direto ao editor.
 */

const bodySchema = z.object({
  template: z.enum(TEMPLATE_IDS as [string, ...string[]]).optional(),
});

export async function POST(request: Request) {
  // Corpo vazio é o caminho normal agora — só é erro se vier algo inválido.
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Esse template não existe. Escolha um da lista." },
      { status: 400 },
    );
  }

  const template = parsed.data.template ?? DEFAULT_TEMPLATE;
  const anonId = await ensureAnonId();

  const draft = await createDraft({
    templateId: template,
    content: defaultContent(template),
    anonId,
  });

  return NextResponse.json(
    { id: draft.id, slug: draft.slug },
    { status: 201 },
  );
}
