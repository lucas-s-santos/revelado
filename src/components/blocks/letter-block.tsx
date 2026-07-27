import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Carta — SPEC 7.2. Sem `"use client"`: é texto.
 *
 * O `typewriter` do schema é intencionalmente ignorado aqui e tratado no
 * `TypewriterText` (client), carregado só quando ligado — quem não usa não paga
 * o JS (SPEC 10).
 */
export function LetterBlock({ props }: { props: PropsOf<"letter"> }) {
  const paragraphs = props.text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
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
}
