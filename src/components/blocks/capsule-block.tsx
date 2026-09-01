import { CapsuleCountdown } from "@/components/blocks/capsule-countdown";
import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Cápsula do tempo — um texto que só abre na data marcada.
 *
 * O que ela resolve não é técnico, é humano: a pessoa quer preparar a página
 * com antecedência e tem medo de estragar a surpresa mandando cedo demais. Com
 * a cápsula ela manda o link quando quiser, e a parte que importa fica lacrada
 * até a data — o contador regressivo vira, ele mesmo, expectativa.
 *
 * **Sem `"use client"`, e isso é o recurso inteiro.**
 *
 * A primeira versão deste arquivo era um Client Component que decidia no
 * navegador se mostrava o contador ou o texto. Parecia certo e estava errado:
 * props de Client Component são serializadas no HTML para a hidratação, então
 * o texto lacrado ia junto no payload da página. Bastava abrir o código-fonte
 * para ler a surpresa antes da hora. Medido: o texto aparecia no HTML da
 * página publicada enquanto a cápsula estava fechada.
 *
 * Agora quem decide é o servidor. Fechada, só a data atravessa a fronteira —
 * o texto nem chega a ser passado adiante. E é o servidor que confere a hora,
 * que é o único lado onde essa conferência vale alguma coisa: o relógio de
 * quem abriu o link é dele, não nosso.
 *
 * **O preview mostra a cápsula LACRADA, igual à página publicada.** A primeira
 * versão abria no preview, com o argumento de que quem monta precisa ver o que
 * escreveu — e quebrou o teste que garante que preview e publicada renderizam
 * o mesmo DOM (anti-padrão 2). O teste estava certo: um preview que abre a
 * cápsula mente sobre o que a outra pessoa vai receber, que é justamente o que
 * o preview existe para mostrar. Quem escreveu lê o próprio texto no campo do
 * passo, ao lado.
 */
export function CapsuleBlock({
  props,
  now,
}: {
  props: PropsOf<"capsule">;
  now?: number;
}) {
  const quando = formatarData(props.openAt);
  const aberta = (now ?? Date.now()) >= new Date(props.openAt).getTime();

  if (!aberta) {
    // Só a data. O texto para aqui.
    return <CapsuleCountdown openAt={props.openAt} now={now} quando={quando} />;
  }

  return (
    <section className="block-capsule is-aberta">
      <p className="eyebrow">{quando}</p>
      <p className="block-capsule__texto">{props.text}</p>
    </section>
  );
}

/** "14 de fevereiro", sem o ano: a data importa, o ano é ruído. */
function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
}
