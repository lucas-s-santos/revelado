import type { SiteContent } from "@/lib/blocks/schema";

/**
 * Tira o texto das cápsulas que ainda não abriram, antes de o conteúdo chegar
 * ao renderer.
 *
 * **Não é redundância com o componente — é o único lugar onde isso funciona.**
 *
 * O `registry` dos blocos é importado tanto pelo renderer da página publicada,
 * no servidor, quanto pela árvore cliente do editor. Com isso o bundler trata
 * os blocos como referência de cliente, e o React serializa as props deles no
 * payload RSC que vai dentro do HTML, para hidratar. Ou seja: qualquer prop que
 * chegue ao renderer é legível no código-fonte da página, por mais que o
 * componente decida não desenhá-la.
 *
 * Foi medido: com o texto passando adiante, ele aparecia no HTML da página
 * publicada enquanto a cápsula estava fechada — bastava abrir o código-fonte
 * para ler a surpresa antes da hora. Tirar o `"use client"` do bloco não
 * resolveu, porque quem decide o que é cliente é o bundler, não o arquivo.
 *
 * Quem confere a data é o servidor, que é o único lado onde a conferência vale
 * alguma coisa: o relógio de quem abriu o link é dele, não nosso.
 */
export function lacrarCapsulas(
  content: SiteContent,
  agora: number,
): SiteContent {
  const fechada = (openAt: string) => agora < Date.parse(openAt);

  const temLacrada = content.blocks.some(
    (block) => block.type === "capsule" && fechada(block.props.openAt),
  );

  // Sem cápsula fechada, devolve o mesmo objeto: copiar à toa invalidaria
  // memoização de quem receber isto adiante.
  if (!temLacrada) return content;

  return {
    ...content,
    blocks: content.blocks.map((block) =>
      block.type === "capsule" && fechada(block.props.openAt)
        ? { ...block, props: { ...block.props, text: "" } }
        : block,
    ),
  };
}
