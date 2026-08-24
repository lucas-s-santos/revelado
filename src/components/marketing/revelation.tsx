"use client";

import { useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { copy } from "@/lib/copy";

/**
 * A quebra escura da landing — SPEC 8.1 seção 7.
 *
 * É a única seção que respira no escuro. Tudo em volta é a pele clara, e o
 * contraste entre as duas é o que faz a página ter respiração em vez de
 * rolar como um bloco rosa só.
 *
 * O que estava aqui antes eram quatro molduras vazias esperando fotos de
 * exemplo que nunca chegaram. Na tela isso lê como imagem quebrada, não como
 * espera — então o lugar passou a ser do envelope, que não depende de asset
 * nenhum: é forma em CSS.
 *
 * Cliente por causa de um `useState`. O envelope é um `<button>` de verdade,
 * então teclado e leitor de tela funcionam sem nada extra. Com
 * `prefers-reduced-motion` a aba não gira: o estado troca sem transição
 * (regra 14).
 */
export function Revelation() {
  const [aberto, setAberto] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="deep-band">
      <section className="section deep-band__inner">
        <div className="revelation__grid">
          <div className="revelation__copy">
            <p className="eyebrow eyebrow--on-deep">{copy.revelation.eyebrow}</p>

            <h2 className="section__title">
              {copy.revelation.titleLead}{" "}
              <span className="display-italic">
                {copy.revelation.titleAccent}
              </span>
            </h2>

            <p className="revelation__lede">{copy.revelation.lede}</p>
          </div>

          <div className="revelation__stage">
            <button
              type="button"
              aria-expanded={aberto}
              aria-label={aberto ? copy.revelation.close : copy.revelation.open}
              onClick={() => setAberto((v) => !v)}
              data-open={aberto || undefined}
              data-still={reduced || undefined}
              className="envelope"
            >
              <span aria-hidden className="envelope__card">
                {copy.revelation.peek}
              </span>
              <span aria-hidden className="envelope__body" />
              <span aria-hidden className="envelope__flap" />
              <span aria-hidden className="envelope__seal" />
            </button>

            <p className="revelation__hint" aria-live="polite">
              {aberto ? copy.revelation.openHint : copy.revelation.closedHint}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
