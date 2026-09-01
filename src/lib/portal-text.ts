/**
 * As duas frases do portal, num módulo só delas.
 *
 * Mesmo motivo do `lib/units.ts`: a página publicada não pode importar
 * `lib/copy`. Aquele arquivo é um objeto único de ~14 KB com o texto inteiro da
 * landing, e como não é tree-shakeable, uma linha de `import { copy }` num
 * componente da página publicada leva junto todo o material de marketing —
 * headline, preços, FAQ, depoimentos — para o bundle de quem só quer ver um
 * presente. Foi exatamente assim que o orçamento da SPEC 10 estourou quando o
 * portal nasceu: 116,2 KB viraram 120,3 KB, contra um teto de 120.
 *
 * O `lib/copy` reexporta isto, então continua existindo um lugar só para
 * procurar texto de interface (SPEC 12) — o que muda é de onde a folha da
 * árvore importa.
 */
export const portalText = {
  chamada: "alguém preparou esta página para você",
  acao: "toque para abrir",
} as const;
