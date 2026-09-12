import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAnonId } from "@/lib/anon";
import { createDraft } from "@/lib/drafts";
import { OCCASION_IDS, type OccasionId } from "@/lib/occasions";
import { contentForTemplate } from "@/lib/templates";
import { limitOr429 } from "@/lib/rate-limit";

/**
 * Cria um rascunho — SPEC 8.2: "cria um `Site` em DRAFT com `anonId` de cookie",
 * e o aceite pede o rascunho criado **no servidor antes da navegação**.
 */

const bodySchema = z.object({
  occasion: z.enum(OCCASION_IDS),
  template: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  // Rascunho é gratuito e sem login: o teto é o que impede encher o banco de
  // linhas vazias (SPEC 9.4).
  const limited = await limitOr429(
    "drafts",
    "Muitas páginas criadas seguidas. Espere um minuto para começar outra.",
  );
  if (limited) return limited;

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
    content: contentForTemplate(occasion, parsed.data.template),
    anonId,
  });

  return NextResponse.json(
    { id: draft.id, slug: draft.slug, occasion: draft.occasionId },
    { status: 201 },
  );
}
