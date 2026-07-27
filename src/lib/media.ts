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

export function publicUrlFor(draftId: string, mediaId: string): string {
  const key = mediaPath(draftId, mediaId);
  return PUBLIC_HOST ? `https://${PUBLIC_HOST}/${key}` : `/api/media/${key}`;
}

/**
 * Resolvedor pronto para o `BlockRenderer`, que recebe `mediaSrc(mediaId)`.
 * Quando a fila `media.process` da Fase 5 gerar as variantes 400/800/1600,
 * é aqui que o `srcSet` nasce.
 */
export function mediaResolver(draftId: string) {
  return (mediaId: string) => publicUrlFor(draftId, mediaId);
}
