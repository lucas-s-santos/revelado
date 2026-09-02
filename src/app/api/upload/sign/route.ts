import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { podeMexerNoRascunho } from "@/lib/anon";
import { getDraft } from "@/lib/drafts";
import { PLANS } from "@/lib/plans";
import {
  isAcceptedMime,
  LOCAL_MEDIA_ENABLED,
  MAX_UPLOAD_BYTES,
  mediaKey,
  publicUrlFor,
  R2_CONFIGURED,
  signUploadUrl,
} from "@/lib/r2";

/**
 * URL assinada para upload — SPEC 9.1: "valida mime, tamanho e cota do plano".
 *
 * O arquivo nunca passa por aqui: o browser sobe direto para o R2 com a URL que
 * esta rota devolve (anti-padrão 8).
 */

const bodySchema = z.object({
  draftId: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
});

/** Teto absoluto: o maior plano. O limite do plano-alvo é cobrado na interface. */
const HARD_PHOTO_LIMIT = Math.max(...PLANS.map((plan) => plan.maxPhotos));

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const { draftId, mime, bytes } = parsed.data;

  if (!isAcceptedMime(mime)) {
    return NextResponse.json(
      { error: "Formato não aceito. Envie JPG, PNG, WebP ou AVIF." },
      { status: 415 },
    );
  }

  if (bytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Esta foto ficou grande demais. Tente uma imagem menor." },
      { status: 413 },
    );
  }

  const draft = await getDraft(draftId);
  if (!draft) {
    return NextResponse.json(
      { error: "Rascunho não encontrado." },
      { status: 404 },
    );
  }

  // Fail-closed: sem dono, nega. Ver a regra em lib/anon.
  if (!(await podeMexerNoRascunho(draft.anonId))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  // Cota: conta o que já existe nas galerias do rascunho.
  const used = draft.content.blocks.reduce(
    (total, block) =>
      block.type === "gallery" ? total + block.props.mediaIds.length : total,
    0,
  );

  if (used >= HARD_PHOTO_LIMIT) {
    return NextResponse.json(
      {
        error: `O limite é de ${HARD_PHOTO_LIMIT} fotos por página. Remova alguma para adicionar outra.`,
      },
      { status: 409 },
    );
  }

  const mediaId = randomUUID();
  const key = mediaKey(draftId, mediaId);

  if (!R2_CONFIGURED) {
    if (!LOCAL_MEDIA_ENABLED) {
      return NextResponse.json(
        {
          error:
            "O envio de fotos está indisponível. (R2 não configurado neste ambiente.)",
        },
        { status: 503 },
      );
    }

    // Modo local: grava em disco pela rota de desenvolvimento.
    return NextResponse.json({
      mediaId,
      key,
      uploadUrl: `/api/upload/dev?key=${encodeURIComponent(key)}`,
      publicUrl: publicUrlFor(key),
      dev: true,
    });
  }

  return NextResponse.json({
    mediaId,
    key,
    uploadUrl: await signUploadUrl(key, mime),
    publicUrl: publicUrlFor(key),
    dev: false,
  });
}
