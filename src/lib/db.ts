import { PrismaClient } from "@prisma/client";

// Singleton — o dev server do Next recria módulos a cada HMR e estouraria o pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * SPEC 7.1 — nenhuma query no app sem filtrar deletedAt: null.
 * Use este filtro em toda leitura de Site.
 */
export const notDeleted = { deletedAt: null } as const;

/**
 * Existe banco configurado?
 *
 * **Função, não constante.** Constante é avaliada no `import`, e aí quem tenta
 * mudar o ambiente depois — um teste que quer o backend de arquivo — não
 * consegue mais: o valor já foi decidido. Foi assim que a suíte passava local e
 * reprovava no CI, onde `DATABASE_URL` existe só para o `prisma generate` e os
 * testes acabavam tentando falar com um Postgres que não está lá.
 *
 * É a mesma lição do `devDir()` em `lib/dev-store.ts`: decisão que depende do
 * ambiente se lê na hora do uso.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
