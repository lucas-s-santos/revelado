import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAnonId } from "@/lib/anon";
import { defaultContent } from "@/lib/blocks/defaults";
import { createDraft } from "@/lib/drafts";
import { OCCASION_IDS, type OccasionId } from "@/lib/occasions";

/**
 * Cria um rascunho — SPEC 8.2: "cria um `Site` em DRAFT com `anonId` de cookie",
 * e o aceite pede o rascunho criado **no servidor antes da navegação**.
 */

const bodySchema = z.object({
  occasion: z.enum(OCCASION_IDS),
  template: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Escolha uma ocasião válida para começar." },
      { status: 400 },
    );
  }

  const occasion = parsed.data.occasion as OccasionId;
  const anonId = await ensureAnonId();

  const draft = await createDraft({
    occasionId: occasion,
    templateId: parsed.data.template ?? null,
    content: defaultContent(occasion, parsed.data.template),
    anonId,
  });

  return NextResponse.json(
    { id: draft.id, slug: draft.slug, occasion: draft.occasionId },
    { status: 201 },
  );
}
