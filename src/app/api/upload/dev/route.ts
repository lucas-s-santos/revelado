import { mkdir, writeFile } from "node:fs/promises";

import { devDir } from "@/lib/dev-store";
import { dirname, join, normalize } from "node:path";

import { NextResponse } from "next/server";

import { LOCAL_MEDIA_ENABLED, MAX_UPLOAD_BYTES } from "@/lib/r2";

/**
 * Recebedor de upload **só de desenvolvimento**.
 *
 * Existe para o editor ser montável e testável sem conta na Cloudflare. Em
 * produção o browser sobe direto para o R2 com URL assinada, e esta rota se
 * recusa a existir (SPEC 2 e anti-padrão 8).
 */

const DEV_MEDIA_DIR = devDir("media");

export async function PUT(request: Request) {
  if (!LOCAL_MEDIA_ENABLED) {
    return NextResponse.json({ error: "Não disponível." }, { status: 404 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Falta a chave." }, { status: 400 });
  }

  // Path traversal: a chave vem do cliente, então normaliza e confere o prefixo.
  const target = normalize(join(DEV_MEDIA_DIR, key));
  if (!target.startsWith(DEV_MEDIA_DIR)) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Arquivo grande demais." },
      { status: 413 },
    );
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);

  // A chave não tem extensão (ver mediaKey), então o tipo vai num arquivo ao
  // lado — é o equivalente pobre dos metadados que o R2 guarda no objeto.
  const mime = request.headers.get("content-type") ?? "image/webp";
  await writeFile(`${target}.type`, mime, "utf8");

  return NextResponse.json({ ok: true, bytes: buffer.byteLength });
}
