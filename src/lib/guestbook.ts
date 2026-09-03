import { createHash } from "node:crypto";

import { db } from "@/lib/db";

/**
 * Mural de recados — SPEC 7.1 (`model GuestbookEntry`) e 8.9.
 *
 * Servidor só: quem publica um recado passa por `/api/guestbook`, nunca por
 * uma chamada direta daqui — `guestbook-block.tsx` ("use client") importa só
 * o tipo `GuestbookPublicEntry`, zero Prisma no bundle do navegador (mesmo
 * acordo de `lib/templates-db.ts`/`lib/plans-db.ts`).
 *
 * `ipHash` nunca guarda o IP cru (LGPD, comentário já no schema) — mesmo
 * padrão de pimenta com `AUTH_SECRET` que `lib/site-password.ts` usa para o
 * token de destravamento.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${process.env.AUTH_SECRET ?? "revelado"}`)
    .digest("hex");
}

export interface GuestbookPublicEntry {
  id: string;
  name: string;
  message: string;
  createdAt: Date;
}

/**
 * Só os aprovados — para a página publicada. Sem `unstable_cache`: a leitura
 * de conteúdo em `lib/sites.ts` é cacheada por 1h e recados novos não podem
 * esperar o cache do TEXTO da página para aparecer. Continuam sujeitos ao
 * mesmo ISR de 1h da rota (SPEC 8.8 já registra isso como pendência geral,
 * não uma exceção deste bloco).
 */
export async function listApprovedEntries(
  siteId: string,
): Promise<GuestbookPublicEntry[]> {
  if (!hasDatabase) return [];

  return db.guestbookEntry.findMany({
    where: { siteId, approved: true },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, message: true, createdAt: true },
  });
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitEntry(input: {
  siteId: string;
  name: string;
  message: string;
  ip: string;
  /** `!guestbookBlock.props.moderated` — a pessoa dona da página decide. */
  autoApprove: boolean;
}): Promise<SubmitResult> {
  if (!hasDatabase) {
    return { ok: false, error: "Indisponível neste ambiente." };
  }

  await db.guestbookEntry.create({
    data: {
      siteId: input.siteId,
      name: input.name,
      message: input.message,
      approved: input.autoApprove,
      ipHash: hashIp(input.ip),
    },
  });

  return { ok: true };
}

// --- admin (SPEC 8.9: fila de moderação) ------------------------------------

export interface PendingEntry {
  id: string;
  siteSlug: string;
  name: string;
  message: string;
  createdAt: Date;
}

/** A fila — mais antigo primeiro, para o admin não esquecer ninguém. */
export async function listPendingEntries(limit = 50): Promise<PendingEntry[]> {
  const entries = await db.guestbookEntry.findMany({
    where: { approved: false },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      message: true,
      createdAt: true,
      site: { select: { slug: true } },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    siteSlug: entry.site.slug,
    name: entry.name,
    message: entry.message,
    createdAt: entry.createdAt,
  }));
}

/** Aprovar marca; rejeitar apaga — não existe "rejeitado" para guardar. */
export async function moderateEntry(
  id: string,
  approve: boolean,
): Promise<void> {
  if (approve) {
    await db.guestbookEntry
      .update({ where: { id }, data: { approved: true } })
      .catch(() => {});
  } else {
    await db.guestbookEntry.delete({ where: { id } }).catch(() => {});
  }
}
