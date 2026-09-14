import { unstable_cache } from "next/cache";

import { migrate } from "@/lib/blocks/migrate";
import { DEMO_SLUG, demoContent } from "@/lib/blocks/fixtures";
import type { SiteContent } from "@/lib/blocks/schema";
import { siteTag } from "@/lib/cache";
import { db, hasDatabase, notDeleted } from "@/lib/db";
import { findDraftBySlug } from "@/lib/drafts";

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
  hasPassword: boolean;
  indexable: boolean;
  expiresAt: Date | null;
  /** true quando veio do fixture, sem banco */
  isDemo?: boolean;
}

/** O banco está configurado? Sem Neon, o slug de exemplo ainda funciona. */

/**
 * Leitura cacheada por tag — SPEC 8.8.
 *
 * A tag é por slug (`site:abc`), então editar uma página derruba o cache **dela**
 * e não o do site inteiro. Com pico sazonal de 50x, invalidar tudo junto seria o
 * mesmo que não ter cache.
 *
 * **Os dois backends passam por aqui, e isso não é detalhe.** Antes o modo de
 * arquivo pulava o cache, o que parecia inofensivo — sem banco o arquivo muda a
 * cada salvamento. Só que quem associa a rota `/p/[slug]` à tag é justamente
 * esta leitura: sem ela, o `revalidate = 3600` da página continuava valendo e
 * `revalidateTag` não tinha o que derrubar. Resultado: **pôr senha numa página
 * já no ar não fazia efeito** até a hora do ISR virar. O e2e do funil pegou.
 *
 * Toda mutação que muda o que a página publicada mostra chama `revalidateSite`
 * — publicar, trocar senha, indexação e exclusão — então cachear aqui é seguro
 * nos dois modos.
 */
export async function getPublishedSite(
  slug: string,
): Promise<PublishedSite | null> {
  const cached = unstable_cache(
    () => readPublishedSite(slug),
    ["published-site", slug],
    { tags: [siteTag(slug)], revalidate: 3600 },
  );

  try {
    return hydrate(await cached());
  } catch (error) {
    // Mesma situação do `revalidateSite`: a camada de cache do Next só existe
    // dentro de um request. Fora dele — teste unitário, script de manutenção —
    // ler direto é a resposta certa. Só esta falha específica cai aqui; erro de
    // leitura de verdade continua subindo.
    if (isCacheUnavailable(error)) return readPublishedSite(slug);
    throw error;
  }
}

/**
 * Devolve os tipos que o cache comeu.
 *
 * `unstable_cache` **serializa** o que guarda, então na volta do cache um `Date`
 * virou string. Sem isto, `isExpired` chama `.getTime()` numa string e a página
 * publicada devolve 500 — e só a partir do **segundo** acesso, que é o pior jeito
 * possível de falhar: passa no teste manual, quebra com o público. Valia para
 * todo plano com prazo (`durationDays`), ou seja, quase todos.
 *
 * Achado pelo e2e do funil, que abre a mesma página duas vezes.
 */
function hydrate(site: PublishedSite | null): PublishedSite | null {
  if (!site) return null;

  const expiresAt = site.expiresAt as Date | string | null;
  if (expiresAt === null || expiresAt instanceof Date) return site;

  return { ...site, expiresAt: new Date(expiresAt) };
}

/** O invariante que o Next lança quando não há request por perto. */
function isCacheUnavailable(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("incrementalCache missing")
  );
}

async function readPublishedSite(slug: string): Promise<PublishedSite | null> {
  if (!hasDatabase()) {
    if (slug === DEMO_SLUG) return demoSite();

    // Modo local: a página publicada mora no mesmo arquivo do rascunho.
    const draft = await findDraftBySlug(slug);
    if (!draft || draft.status !== "PUBLISHED") return null;

    return {
      id: draft.id,
      slug: draft.slug,
      content: draft.content,
      hasPassword: Boolean(draft.passwordHash),
      indexable: draft.indexable ?? false,
      expiresAt: draft.expiresAt ?? null,
    };
  }

  const site = await db.site.findFirst({
    where: { slug, ...notDeleted, status: { in: ["PUBLISHED", "EXPIRED"] } },
    select: {
      id: true,
      slug: true,
      content: true,
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
    hasPassword: false,
    indexable: false,
    expiresAt: null,
    isDemo: true,
  };
}

/**
 * Já passou do prazo?
 *
 * Aceita `Date` **e** a string ISO que sobra de uma ida ao cache. O `hydrate`
 * acima já devolve o tipo certo, mas esta função é chamada na tela que é o
 * produto entregue: pagar o dobro do cuidado aqui custa duas linhas e evita um
 * 500 na página de presente de alguém. Data ilegível conta como "no ar" — na
 * dúvida, a página fica de pé.
 */
export function isExpired(site: PublishedSite, at = new Date()): boolean {
  const expiresAt = site.expiresAt as Date | string | null;
  if (expiresAt === null) return false;

  const prazo =
    expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);

  return Number.isFinite(prazo) && prazo <= at.getTime();
}

/**
 * O hash da senha, só para o servidor.
 *
 * Fica fora de `PublishedSite` de propósito: aquele objeto atravessa a fronteira
 * para os blocos que são Client Components, e hash de senha não viaja no payload
 * do RSC. Também fica fora do cache por tag — é leitura de credencial, não de
 * conteúdo.
 */
export async function sitePasswordHash(slug: string): Promise<string | null> {
  const draft = await findDraftBySlug(slug);
  return draft?.passwordHash ?? null;
}
