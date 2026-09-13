import { readFile, writeFile } from "node:fs/promises";

import { devDir } from "@/lib/dev-store";
import { join } from "node:path";

/**
 * Marca o rascunho como publicado no backend de arquivo.
 *
 * Vive num módulo próprio porque `lib/drafts.ts` só sabe ler e salvar conteúdo —
 * mudar status é operação de publicação, não de edição, e misturar as duas foi
 * o que criaria a tentação de publicar de dentro do editor (anti-padrão 6).
 *
 * Com `DATABASE_URL`, quem manda é o Prisma em `lib/publish.ts`; esta função
 * cuida do modo local.
 */

const DEV_DIR = devDir();

export async function markDraftPublished(
  draftId: string,
  expiresAt: Date | null,
): Promise<void> {
  if (process.env.DATABASE_URL) return;

  const path = join(DEV_DIR, `${draftId}.json`);

  try {
    const record = JSON.parse(await readFile(path, "utf8")) as Record<
      string,
      unknown
    >;

    await writeFile(
      path,
      JSON.stringify(
        {
          ...record,
          status: "PUBLISHED",
          publishedAt: new Date().toISOString(),
          expiresAt: expiresAt?.toISOString() ?? null,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // Rascunho sumiu do disco: o pedido continua pago e o suporte resolve.
    // Não dá para inventar conteúdo aqui.
  }
}
