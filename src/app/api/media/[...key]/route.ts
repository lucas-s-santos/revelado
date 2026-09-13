import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

import { NextResponse } from "next/server";

import { devPath } from "@/lib/dev-store";
import { accessForSite, siteIdFromKey } from "@/lib/media-access";
import {
  isAcceptedMime,
  LOCAL_MEDIA_ENABLED,
  R2_CONFIGURED,
  R2_PRIVATE,
  signReadUrl,
} from "@/lib/r2";
import { logDenied } from "@/lib/security-log";

/**
 * Leitura de mídia. A rota faz duas coisas conforme o ambiente:
 *
 *  - **desenvolvimento sem R2**: serve o arquivo que o upload local gravou em
 *    `.drafts/media/`;
 *  - **bucket privado** (`R2_PRIVATE=true`, SPEC 9.4): confere quem está pedindo
 *    e redireciona para uma URL assinada de vida curta.
 *
 * Com o bucket público — o padrão de hoje — esta rota nem entra no caminho: a
 * página aponta direto para o host da Cloudflare.
 *
 * **Por que o porteiro fica aqui.** Proteger a página e deixar as fotos abertas
 * protege nada: os endereços estão no HTML da própria página, e uma URL de
 * bucket público vale para sempre. Aqui a foto vale o que a página dela vale —
 * some quando expira, exige senha quando a página exige, e o rascunho é só do
 * dono (`lib/media-access.ts`).
 */

const DEV_MEDIA_DIR = devPath("media");

type Params = Promise<{ key: string[] }>;

/**
 * Vida da URL assinada.
 *
 * Mais curta que o cache da página seria pior que não assinar: o HTML em cache
 * serviria links já vencidos e a página apareceria sem foto. Duas horas contra
 * a revalidação de uma hora dá folga de sobra.
 */
const SIGNED_TTL_SECONDS = 7200;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { key } = await params;
  const chave = key.join("/");

  // --- bucket privado: porteiro + URL assinada ----------------------------
  if (R2_CONFIGURED && R2_PRIVATE) {
    const siteId = siteIdFromKey(chave);
    if (!siteId) {
      return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
    }

    const acesso = await accessForSite(siteId);

    if (acesso === "not-found") {
      return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
    }

    if (acesso === "deny") {
      await logDenied("owner-mismatch", { rota: "media", siteId });
      // 404 e não 403: dizer "existe, mas você não pode" já entrega que a
      // página existe, e o slug é justamente o que deveria ser segredo.
      return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
    }

    return NextResponse.redirect(await signReadUrl(chave, SIGNED_TTL_SECONDS), {
      status: 307,
      headers: {
        // Privado: o cache é do navegador de quem pediu, nunca de um
        // intermediário — a resposta depende de quem está pedindo. Menos que o
        // prazo da assinatura, para nunca servir um link vencido.
        "cache-control": `private, max-age=${SIGNED_TTL_SECONDS - 600}`,
      },
    });
  }

  // --- desenvolvimento: arquivo em disco ----------------------------------
  if (!LOCAL_MEDIA_ENABLED) {
    return NextResponse.json({ error: "Não disponível." }, { status: 404 });
  }

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
