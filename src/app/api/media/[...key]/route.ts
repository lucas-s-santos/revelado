import { readFile } from "node:fs/promises";

import { devDir } from "@/lib/dev-store";
import { join, normalize } from "node:path";

import { NextResponse } from "next/server";

import { isAcceptedMime, LOCAL_MEDIA_ENABLED } from "@/lib/r2";

/**
 * Serve as mídias gravadas pelo upload de desenvolvimento.
 *
 * Em produção as fotos vêm do R2 pelo host público — esta rota se recusa a
 * existir.
 */

const DEV_MEDIA_DIR = devDir("media");

type Params = Promise<{ key: string[] }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  if (!LOCAL_MEDIA_ENABLED) {
    return NextResponse.json({ error: "Não disponível." }, { status: 404 });
  }

  const { key } = await params;
  const target = normalize(join(DEV_MEDIA_DIR, ...key));

  // A chave vem da URL: normaliza e confere o prefixo contra path traversal.
  if (!target.startsWith(DEV_MEDIA_DIR) || target.endsWith(".type")) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
  }

  try {
    const file = await readFile(target);

    const declared = await readFile(`${target}.type`, "utf8").catch(
      () => "image/webp",
    );
    const contentType = isAcceptedMime(declared.trim())
      ? declared.trim()
      : "image/webp";

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  }
}
