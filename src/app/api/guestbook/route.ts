import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublishedSite } from "@/lib/sites";
import { submitEntry } from "@/lib/guestbook";

/**
 * Recado novo no mural — SPEC 8.9. Rota pública: quem abre a página publicada
 * não tem conta nem cookie de dono (CLAUDE.md regra 8 vale para todo o
 * produto, não só o editor).
 *
 * `moderated` é escolha de quem monta a página (passo do mural no editor): se
 * `true` (padrão), o recado nasce pendente e só aparece depois que o admin
 * aprova na fila; se `false`, aparece na hora — risco que a própria pessoa
 * assumiu ao desligar a moderação.
 */

const bodySchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Diga seu nome.").max(60),
  message: z.string().trim().min(1, "Escreva um recado.").max(500),
  // Campo-isca: só bot preenche. Humano nunca vê o campo (CSS o esconde).
  empresa: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  // Isca preenchida: finge sucesso. Contar a um bot que ele foi pego só
  // ensina o próximo bot a esconder melhor o próprio comportamento.
  if (parsed.data.empresa) {
    return NextResponse.json({ ok: true });
  }

  const site = await getPublishedSite(parsed.data.slug);
  if (!site) {
    return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
  }

  const guestbook = site.content.blocks.find(
    (block) => block.type === "guestbook",
  );
  if (!guestbook || guestbook.type !== "guestbook") {
    return NextResponse.json(
      { error: "Esta página não tem mural de recados." },
      { status: 404 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "desconhecido";

  const result = await submitEntry({
    siteId: site.id,
    name: parsed.data.name,
    message: parsed.data.message,
    ip,
    autoApprove: !guestbook.props.moderated,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, pending: guestbook.props.moderated },
    { status: 201 },
  );
}
