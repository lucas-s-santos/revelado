import { revalidateTag } from "next/cache";

/**
 * Cache da página publicada — SPEC 8.8.
 *
 * "Estática com ISR, **revalidação por tag ao editar**. Uma página viralizada
 * não pode custar nem cair."
 *
 * A tag é por slug: editar uma página derruba o cache **dela**, não o do site
 * inteiro. Com 50x de pico sazonal, invalidar tudo de uma vez seria o mesmo que
 * não ter cache.
 */

export const siteTag = (slug: string) => `site:${slug}`;

/** Chamado ao publicar e a cada edição de página já no ar. */
export function revalidateSite(slug: string): void {
  revalidateTag(siteTag(slug));
}
