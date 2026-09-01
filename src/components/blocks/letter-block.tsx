import { EnvelopeLetter } from "@/components/blocks/envelope-letter";
import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Carta — SPEC 7.2. Sem `"use client"`: é texto.
 *
 * Dois formatos, um conteúdo. `reveal: "envelope"` embrulha o MESMO texto no
 * portão interativo; `plain` entrega direto. Manter os dois como um bloco só é
 * o que garante que trocar de formato nunca apague o que a pessoa escreveu —
 * como blocos separados, a troca perderia a carta (SPEC 8.4).
 *
 * Só o embrulho é cliente. Quem usa a carta comum não carrega JavaScript
 * nenhum por causa deste bloco (SPEC 10).
 */
export function LetterBlock({ props }: { props: PropsOf<"letter"> }) {
  const paragraphs = props.text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const corpo = (
    <section className="block-letter">
      {/* O papel.
       *
       * A carta era um parágrafo alinhado à esquerda sobre o mesmo rosa de
       * todas as outras seções — o item mais importante da página, e o único
       * sem forma própria. Numa página que é presente, a carta precisa
       * parecer uma carta: uma folha, com margem, pousada sobre a página.
       *
       * O papel também resolve a medida de leitura. Solto, o texto ia de
       * ponta a ponta da tela e, no desktop, virava linha de 90 caracteres —
       * o dobro do confortável. */}
      <article className="block-letter__paper">
        <div className="block-letter__body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {props.signature ? (
          <p className="block-letter__signature">— {props.signature}</p>
        ) : null}
      </article>
    </section>
  );

  if (props.reveal === "envelope") {
    return <EnvelopeLetter props={props}>{corpo}</EnvelopeLetter>;
  }

  return corpo;
}
