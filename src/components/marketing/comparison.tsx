import { Check, Minus } from "lucide-react";

import { copy } from "@/lib/copy";
import { planComparison } from "@/lib/plans";

/**
 * Comparação entre os dois planos — SPEC 8.1.
 *
 * Ocupa o lugar que esse tipo de página costuma dar ao "nós contra as outras
 * plataformas". A troca é deliberada: afirmar o que um concorrente não faz
 * exige verificar o produto dele, e ninguém verifica — vira alegação solta. A
 * dúvida de quem chegou nesta altura é outra, e é a que a tabela responde:
 * qual dos dois eu levo.
 *
 * As linhas vêm de `planComparison()`, que lê os números dos próprios planos.
 * Um teste amarra as duas coisas, para a tabela não anunciar "10 fotos" no dia
 * em que o plano passar a dar 15.
 *
 * Server Component: é tabela, não tem estado.
 */
export function Comparison() {
  const rows = planComparison();

  return (
    <section className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.comparison.eyebrow}</p>
        <h2 className="section__title">{copy.comparison.title}</h2>
        <p className="section__lede">{copy.comparison.lede}</p>
      </header>

      {/* Tabela larga rola dentro do próprio contêiner: o corpo da página
          nunca rola de lado (SPEC 8.1). */}
      <div className="compare__scroll">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Recurso</span>
              </th>
              <th scope="col">{copy.comparison.columns.simples}</th>
              <th scope="col" className="compare__best">
                {copy.comparison.columns.especial}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <Cell value={row.simples} />
                <Cell value={row.especial} destaque />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Uma célula. Texto quando o valor é texto; marca quando é sim ou não.
 *
 * O "não" é um traço, não um X vermelho: aqui ninguém está reprovando o plano
 * barato — ele é uma escolha legítima, e pintá-lo de erro empurraria a pessoa
 * para o caro pelo constrangimento em vez de pela vontade.
 */
function Cell({ value, destaque }: { value: boolean | string; destaque?: boolean }) {
  if (typeof value === "string") {
    return (
      <td className={destaque ? "compare__best" : undefined}>
        <span className="compare__text">{value}</span>
      </td>
    );
  }

  return (
    <td className={destaque ? "compare__best" : undefined}>
      {value ? (
        <>
          <Check size={17} aria-hidden className="compare__yes" />
          <span className="sr-only">{copy.comparison.yes}</span>
        </>
      ) : (
        <>
          <Minus size={17} aria-hidden className="compare__no" />
          <span className="sr-only">{copy.comparison.no}</span>
        </>
      )}
    </td>
  );
}
