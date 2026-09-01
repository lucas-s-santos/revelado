import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Motivos — o formato "100 motivos por que eu te amo".
 *
 * Sem `"use client"`: é lista. Nada aqui reage a nada.
 *
 * **O número é o presente.** Ninguém escreve cem motivos por engano, e é a
 * quantidade que comunica o trabalho que deu — por isso a contagem aparece no
 * cabeçalho e cada item é numerado. Uma lista com marcador redondo esconderia
 * exatamente o que faz esse formato funcionar.
 *
 * A numeração vem do CSS (`counter`), não do JSX: assim o número não é texto
 * selecionável nem lido pelo leitor de tela, que já anuncia "item 3 de 100"
 * pela semântica do `<ol>`. Escrever o número na marra faria a leitura sair
 * duplicada.
 */
export function ReasonsBlock({ props }: { props: PropsOf<"reasons"> }) {
  const total = props.items.length;

  if (total === 0) {
    // Tela vazia é convite, não recado triste (SPEC 11).
    return (
      <section className="block-reasons is-empty">
        <p className="block-reasons__empty">
          Um motivo já basta para começar.
        </p>
      </section>
    );
  }

  return (
    <section className="block-reasons">
      <header className="block-reasons__head">
        <p data-numeric className="block-reasons__count">
          {total}
        </p>
        <h2 className="block-reasons__title">{props.title}</h2>
      </header>

      <ol className="block-reasons__list">
        {props.items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 12)}`} className="block-reasons__item">
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}
