/**
 * Resolução de `mediaId` → URL.
 *
 * O `SiteContent` guarda só o `mediaId`; a URL é derivada dele. Isso mantém o
 * JSON dos blocos independente de onde a foto está hospedada — trocar de bucket
 * não exige migrar conteúdo publicado (SPEC 7.2).
 *
 * O caminho tem que bater com `mediaKey` de `lib/r2.ts`. Em desenvolvimento o
 * arquivo é servido por `/api/media/…`; em produção, pelo host público do R2.
 */

const PUBLIC_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;

export function mediaPath(draftId: string, mediaId: string): string {
  return `sites/${draftId}/${mediaId}`;
}

/**
 * As fotos da página de exemplo moram em `public/demo/` e não no bucket.
 *
 * O exemplo é conteúdo do produto, não upload de ninguém: seus ids nunca
 * passaram pela fila de mídia, então o caminho normal devolvia uma URL que
 * dava 404 — e a página que a pessoa abre para decidir comprar mostrava
 * quatro ícones de imagem quebrada.
 *
 * O prefixo é seguro como discriminador: id de upload é UUID, nunca a string
 * literal `demo-1`. Gerados por `scripts/prepare-demo.mjs`.
 */
const DEMO_PREFIX = "demo-";

export function isDemoMedia(mediaId: string): boolean {
  return mediaId.startsWith(DEMO_PREFIX);
}

export function publicUrlFor(draftId: string, mediaId: string): string {
  if (isDemoMedia(mediaId)) return `/demo/${mediaId}.webp`;

  const key = mediaPath(draftId, mediaId);
  return PUBLIC_HOST ? `https://${PUBLIC_HOST}/${key}` : `/api/media/${key}`;
}

/**
 * Mapa `mediaId → URL` para o `BlockRenderer`.
 *
 * **Mapa, não função**, e isso é o ponto: o renderer roda no servidor em
 * `/p/[slug]` e entrega props para blocos que são Client Components (contador,
 * música). Função não atravessa essa fronteira — o React derruba o render com
 * "Functions cannot be passed directly to Client Components". Um objeto simples
 * atravessa, e ainda fica visível no payload para depurar.
 *
 * Quando a fila `media.process` gerar as variantes 400/800/1600, é aqui que o
 * `srcSet` nasce.
 */
export function mediaMapFor(
  draftId: string,
  mediaIds: Iterable<string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const mediaId of mediaIds) map[mediaId] = publicUrlFor(draftId, mediaId);
  return map;
}

/** Todos os mediaIds citados por um conteúdo, de qualquer bloco. */
export function collectMediaIds(content: {
  blocks: readonly { type: string; props: Record<string, unknown> }[];
}): string[] {
  const ids = new Set<string>();

  for (const block of content.blocks) {
    const { mediaId, mediaIds, items } = block.props as {
      mediaId?: unknown;
      mediaIds?: unknown;
      items?: unknown;
    };

    if (typeof mediaId === "string") ids.add(mediaId);

    if (Array.isArray(mediaIds)) {
      for (const id of mediaIds) if (typeof id === "string") ids.add(id);
    }

    // A linha do tempo guarda um mediaId por item.
    if (Array.isArray(items)) {
      for (const item of items) {
        const itemMediaId = (item as { mediaId?: unknown })?.mediaId;
        if (typeof itemMediaId === "string") ids.add(itemMediaId);
      }
    }
  }

  return [...ids];
}
