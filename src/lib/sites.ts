import { migrate } from "@/lib/blocks/migrate";
import { DEMO_SLUG, demoContent } from "@/lib/blocks/fixtures";
import type { SiteContent } from "@/lib/blocks/schema";
import { db, notDeleted } from "@/lib/db";

/**
 * Leitura de páginas publicadas.
 *
 * SPEC 7.1: nenhuma query sem filtrar `deletedAt: null`. SPEC 7.2: `migrate`
 * roda **na leitura**, sempre.
 */

export interface PublishedSite {
  /** id do Site — é o prefixo das chaves de mídia no R2 (ver lib/media.ts). */
  id: string;
  slug: string;
  content: SiteContent;
  occasionId: string;
  hasPassword: boolean;
  indexable: boolean;
  expiresAt: Date | null;
  /** true quando veio do fixture, sem banco */
  isDemo?: boolean;
}

/** O banco está configurado? Sem Neon, o slug de exemplo ainda funciona. */
const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getPublishedSite(
  slug: string,
): Promise<PublishedSite | null> {
  if (!hasDatabase) {
    return slug === DEMO_SLUG ? demoSite() : null;
  }

  const site = await db.site.findFirst({
    where: { slug, ...notDeleted, status: { in: ["PUBLISHED", "EXPIRED"] } },
    select: {
      id: true,
      slug: true,
      content: true,
      occasionId: true,
      passwordHash: true,
      indexable: true,
      expiresAt: true,
    },
  });

  if (!site) {
    // O exemplo continua valendo mesmo com banco: é conteúdo de marketing.
    return slug === DEMO_SLUG ? demoSite() : null;
  }

  const result = migrate(site.content);
  if (!result.content) {
    // Conteúdo inválido não pode derrubar a página — quem vê é quem recebeu o
    // presente. Trata como não encontrada e o Sentry registra o erro.
    console.error(`[site:${slug}] content inválido: ${result.error}`);
    return null;
  }

  return {
    id: site.id,
    slug: site.slug,
    content: result.content,
    occasionId: site.occasionId,
    hasPassword: Boolean(site.passwordHash),
    indexable: site.indexable,
    expiresAt: site.expiresAt,
  };
}

function demoSite(): PublishedSite {
  return {
    id: DEMO_SLUG,
    slug: DEMO_SLUG,
    content: demoContent,
    occasionId: demoContent.occasion,
    hasPassword: false,
    indexable: false,
    expiresAt: null,
    isDemo: true,
  };
}

export function isExpired(site: PublishedSite, at = new Date()): boolean {
  return site.expiresAt !== null && site.expiresAt.getTime() <= at.getTime();
}
