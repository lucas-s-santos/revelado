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
      <div className="block-letter__body">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {props.signature ? (
        <p className="block-letter__signature">— {props.signature}</p>
      ) : null}
    </section>
  );

  if (props.reveal === "envelope") {
    return <EnvelopeLetter props={props}>{corpo}</EnvelopeLetter>;
  }

  return corpo;
}
