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

/**
 * Chamado ao publicar e a cada edição de página já no ar.
 *
 * `revalidateTag` só existe dentro de um request do Next e lança um invariante
 * fora dele. Quem chama isto é o webhook do pagamento — o caminho do dinheiro —
 * e amanhã será a fila `site.publish` (SPEC 9.2), que roda fora de qualquer
 * request. Publicação confirmada não pode falhar porque a limpeza de cache não
 * estava disponível: no pior caso a página aparece quando o ISR de uma hora
 * virar, o que é bem melhor que um pagamento aprovado sem página no ar.
 */
export function revalidateSite(slug: string): void {
  try {
    revalidateTag(siteTag(slug));
  } catch (error) {
    // Sem a pilha: isto é esperado fora de um request e não é uma falha do
    // fluxo, só um cache que vai expirar sozinho.
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[cache] não deu para invalidar ${siteTag(slug)}: ${detail}`);
  }
}
