"use client";

import { useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { PropsOf } from "@/lib/blocks/schema";

/**
 * A carta em formato envelope — o "carta interativa".
 *
 * Cliente porque tem estado. É o único pedaço da carta que vira JavaScript: a
 * carta comum continua sendo texto puro no servidor, e quem não usa este
 * formato não paga o JS (SPEC 10).
 *
 * O envelope é um **portão**, não um recipiente. Fechado, é a forma; aberto, a
 * carta aparece como papel logo abaixo. Tentar caber o texto dentro do
 * envelope limitaria o tamanho da carta — e a carta é justamente a parte que
 * ninguém quer encurtar.
 *
 * Uma vez aberta, não fecha. Quem recebeu está lendo; um clique errado que
 * escondesse o texto de volta seria hostil.
 *
 * `prefers-reduced-motion` desliga a animação, e o estado troca igual
 * (regra 14).
 */
export function EnvelopeLetter({
  props,
  children,
}: {
  props: PropsOf<"letter">;
  children: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="letter-envelope" data-open={aberta || undefined}>
      {!aberta ? (
        <button
          type="button"
          onClick={() => setAberta(true)}
          data-still={reduced || undefined}
          className="letter-envelope__seal"
        >
          <span aria-hidden className="letter-envelope__shape">
            <span className="letter-envelope__flap" />
            <span className="letter-envelope__body" />
          </span>

          <span className="letter-envelope__cue">
            {props.signature
              ? `Uma carta de ${props.signature}`
              : "Tem uma carta aqui"}
          </span>

          <span className="letter-envelope__hint">toque para abrir</span>
        </button>
      ) : (
        <div className="letter-envelope__paper" data-still={reduced || undefined}>
          {children}
        </div>
      )}
    </div>
  );
}
