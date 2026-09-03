import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAnonId } from "@/lib/anon";
import { defaultContent, DEFAULT_TEMPLATE } from "@/lib/blocks/defaults";
import { createDraft } from "@/lib/drafts";
import { getTemplateById } from "@/lib/templates-db";

/**
 * Cria um rascunho — SPEC 8.2: "cria um `Site` em DRAFT com `anonId` de cookie".
 *
 * Sem ocasião para escolher, o corpo virou opcional: `POST` sem nada já devolve
 * um rascunho no template essencial. É o que `/criar` usa para mandar a pessoa
 * direto ao editor.
 */

const bodySchema = z.object({
  template: z.string().min(1).max(64).optional(),
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

  const requested = parsed.data.template;
  // Sem enum estático: o admin cria template novo sem deploy (SPEC 8.9), e
  // este id só existe no banco a partir de então.
  if (requested && !(await getTemplateById(requested))) {
    return NextResponse.json(
      { error: "Esse template não existe. Escolha um da lista." },
      { status: 400 },
    );
  }

  const template = requested ?? DEFAULT_TEMPLATE;
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
