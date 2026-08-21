import { NextResponse } from "next/server";

import { readAnonId } from "@/lib/anon";
import { getDraft, saveDraftContent } from "@/lib/drafts";

/**
 * Autosave do rascunho — SPEC 9.1.
 *
 * Valida com zod no servidor (SPEC 12) e rejeita edição de página já publicada
 * (o QR impresso aponta para ela). A resposta é curta de propósito: o editor
 * chama isto a cada 800ms de digitação.
 */

type Params = Promise<{ id: string }>;

/** Só o dono do cookie mexe no rascunho (SPEC 9.4). */
async function assertOwner(draftAnonId: string | null): Promise<boolean> {
  if (!draftAnonId) return true; // rascunho já migrado para uma conta
  const anonId = await readAnonId();
  return anonId === draftAnonId;
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const draft = await getDraft(id);

  if (!draft) {
    return NextResponse.json(
      { error: "Rascunho não encontrado." },
      { status: 404 },
    );
  }

  if (!(await assertOwner(draft.anonId))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  return NextResponse.json({
    id: draft.id,
    slug: draft.slug,
    template: draft.templateId,
    status: draft.status,
    content: draft.content,
    updatedAt: draft.updatedAt.toISOString(),
  });
}

/**
 * `navigator.sendBeacon` só sabe mandar POST, e é ele que salva o último trecho
 * digitado quando a aba fecha. Sem este handler, esse salvamento — justamente o
 * que mais importa — voltaria 405.
 */
export async function POST(request: Request, context: { params: Params }) {
  return PATCH(request, context);
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  const existing = await getDraft(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Rascunho não encontrado." },
      { status: 404 },
    );
  }

  if (!(await assertOwner(existing.anonId))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const content =
    body && typeof body === "object" && "content" in body
      ? (body as { content: unknown }).content
      : undefined;

  const result = await saveDraftContent(id, content);

  if (!result.ok) {
    const status =
      result.reason === "not-found"
        ? 404
        : result.reason === "published"
          ? 409
          : 422;

    const message =
      result.reason === "published"
        ? "Esta página já foi publicada e o QR Code dela já está impresso. Edite pelo painel."
        : result.reason === "not-found"
          ? "Rascunho não encontrado."
          : `Não deu para salvar: ${result.detail}`;

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    ok: true,
    updatedAt: result.draft.updatedAt.toISOString(),
  });
}
