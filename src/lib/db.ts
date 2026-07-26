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
