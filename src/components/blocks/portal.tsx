"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
// A folha, e não `lib/copy`: aquele módulo é um objeto único com a landing
// inteira e não é tree-shakeable — importá-lo aqui estourou o orçamento da
// página publicada (SPEC 10). Mesmo motivo do `lib/units` no counter-block.
import { portalText } from "@/lib/portal-text";

/**
 * O portal — o primeiro frame da página publicada.
 *
 * **Ele existe por um motivo técnico antes de ser um motivo bonito.** Todo
 * navegador moderno bloqueia áudio sem um gesto do usuário, e o iOS dentro do
 * webview do WhatsApp — que é por onde a maior parte destes links é aberta — é
 * o mais rígido de todos. Sem um toque, a música simplesmente não toca e o
 * produto perde o que ele promete.
 *
 * Então o toque vira o produto: em vez de um botão de play solto no meio da
 * página, a restrição do navegador é embrulhada no melhor momento da
 * experiência — o envelope fechado que só abre quando a pessoa quer.
 *
 * O que ele NÃO faz, de propósito:
 *
 * - **não esconde o conteúdo do HTML.** Os blocos são renderizados no servidor
 *   e ficam no DOM desde o primeiro byte, embaixo da cobertura. Buscador,
 *   leitor de tela em modo de leitura e preview de link continuam vendo a
 *   página inteira. O portal é uma camada por cima, não um `if` que corta a
 *   árvore.
 * - **não registra listener nenhum.** É um clique e um `useState` — a regra do
 *   listener único da aplicação continua valendo (CLAUDE.md, regra 3).
 * - **não aparece no preview do editor.** Lá dentro ele só atrapalharia quem
 *   está montando a página; quem monta já sabe o que vem.
 *
 * O nome de quem recebe não aparece aqui. A curiosidade é o ativo desta tela:
 * o nome é a primeira coisa que a pessoa vê **depois** de abrir.
 */

const AberturaContext = createContext(false);

/**
 * `true` depois que a pessoa abriu o envelope.
 *
 * Quem consome isto ganha o direito de tocar áudio: o gesto que os navegadores
 * exigem já aconteceu, e foi o toque no portal. Fora da página publicada — no
 * preview do editor, por exemplo — não há portal, o valor é `false` e cada
 * bloco continua pedindo o próprio clique.
 */
export function useAbertura(): boolean {
  return useContext(AberturaContext);
}

export function Portal({
  children,
  para,
}: {
  children: ReactNode;
  /**
   * Para quem é a página, escrito no envelope.
   *
   * A tela dizia "alguém preparou esta página para você" — verdadeiro e
   * genérico, num momento em que a página já sabe os nomes. Um envelope de
   * verdade tem destinatário escrito na frente, e é o destinatário que faz o
   * objeto virar SEU antes mesmo de abrir.
   *
   * Opcional porque o título do hero é texto livre: quem escreveu uma frase
   * inteira em vez de dois nomes não ganha um envelope com um parágrafo
   * escrito nele — nesse caso o envelope fica liso, como era.
   */
  para?: string | undefined;
}) {
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  // Trava a rolagem enquanto o envelope está fechado: rolar por trás de uma
  // cobertura opaca é desorientador, e no celular a barra de endereço some e
  // volta enquanto nada visível se mexe.
  useEffect(() => {
    if (aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // Teclado chega no botão sem precisar tabular por baixo da cobertura.
  useEffect(() => {
    botao.current?.focus();
  }, []);

  function abrir() {
    // Sem movimento a troca é imediata: o estado muda, só não anima (regra 14).
    if (reduced) {
      setAberto(true);
      return;
    }
    // `saindo` primeiro para a cobertura desbotar; o desmonte vem depois, no
    // fim da transição, para não cortar a animação pela metade.
    setSaindo(true);
    window.setTimeout(() => setAberto(true), 620);
  }

  return (
    <AberturaContext.Provider value={aberto}>
      {children}

      {aberto ? null : (
        <div className="portal" data-saindo={saindo ? "" : undefined}>
          <div className="portal__palco">
            <span aria-hidden className="portal__envelope">
              <span className="portal__envelope-corpo" />
              {para ? (
                <span className="portal__envelope-para">{para}</span>
              ) : null}
              <span className="portal__envelope-aba" />
              <span className="portal__envelope-lacre" />
            </span>

            <p className="portal__linha">{portalText.chamada}</p>

            <button
              ref={botao}
              type="button"
              onClick={abrir}
              className="portal__botao"
            >
              {portalText.acao}
            </button>
          </div>
        </div>
      )}
    </AberturaContext.Provider>
  );
}
