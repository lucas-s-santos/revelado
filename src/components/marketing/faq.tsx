import { Plus } from "lucide-react";

import { copy } from "@/lib/copy";

/**
 * FAQ em acordeão — SPEC 8.1 seção 10.
 *
 * `<details>`/`<summary>` nativos em vez do acordeão do Radix: a SPEC 11 pede
 * semântica correta e manda não recriar o widget — usar o do próprio HTML é o
 * caminho mais curto para isso, com teclado e leitor de tela já resolvidos, e
 * **zero JavaScript** no orçamento da landing (SPEC 10).
 *
 * A abertura usa a transição de `grid-template-rows: 0fr → 1fr` pedida na SPEC,
 * via `::details-content`. Onde o navegador não suporta, abre sem animar — o
 * conteúdo continua acessível.
 *
 * Server Component: nenhuma interação passa pelo React.
 */
export function Faq() {
  return (
    <section id="perguntas" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.faq.eyebrow}</p>
        <h2 className="section__title">{copy.faq.title}</h2>
      </header>

      <div className="faq">
        {copy.faq.items.map((item) => (
          <details key={item.q} className="faq__item">
            <summary className="faq__question">
              <span>{item.q}</span>
              <Plus
                size={18}
                strokeWidth={1.75}
                aria-hidden
                className="faq__icon"
              />
            </summary>

            <div className="faq__answer">
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
