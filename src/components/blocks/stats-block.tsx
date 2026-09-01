import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Números — os dados de vocês dois.
 *
 * Sem `"use client"`: são números escritos à mão, não medidos. Nada aqui conta
 * nem reage.
 *
 * **É o contraponto do contador.** O bloco `counter` mede uma coisa só, sozinho
 * e ao vivo, desde a primeira data. Este mede tudo o mais que não tem relógio:
 * quantos países, quantos apartamentos, quantas vezes o mesmo filme. O valor é
 * `string` no schema de propósito — "3", "12 mil" e "∞" precisam caber, e o
 * dia em que alguém quiser escrever "muitas" o bloco não pode recusar.
 *
 * Seis itens é o teto do schema, e não é arbitrário: numa grade de dois ou três
 * por linha, seis fecha o retângulo. O sétimo abriria uma linha órfã.
 *
 * A grade é a mesma família do contador — mesma caixa, mesmo mono, mesmo
 * acento. São dois blocos que dizem a mesma coisa de jeitos diferentes; se
 * parecessem de sites diferentes, a página inteira perderia.
 */
export function StatsBlock({ props }: { props: PropsOf<"stats"> }) {
  // Item sem valor não vira caixa vazia: ele simplesmente não existe. Quem
  // deixou um campo em branco no editor não quer um buraco na página.
  const itens = props.items.filter((item) => item.value.trim().length > 0);

  if (itens.length === 0) {
    // Tela vazia é convite, não recado triste (SPEC 11).
    return (
      <section className="block-stats is-empty">
        <p className="block-stats__empty">
          Um número que só vocês dois entendem já vale a seção.
        </p>
      </section>
    );
  }

  return (
    <section className="block-stats">
      <dl className="block-stats__grid" data-itens={itens.length}>
        {itens.map((item, index) => (
          <div key={`${index}-${item.label}`} className="block-stats__cell">
            {/* <dd> antes de <dt> porque o número é que manda visualmente. A
                ordem do documento segue a leitura da página, e a semântica de
                lista de definição continua valendo em qualquer ordem. */}
            <dd data-numeric className="block-stats__value">
              {item.value}
            </dd>
            <dt className="block-stats__label">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
