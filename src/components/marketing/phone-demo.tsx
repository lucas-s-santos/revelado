"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { DEMO_SLUG } from "@/lib/blocks/demo-slug";
import { copy } from "@/lib/copy";

/**
 * A página de exemplo de verdade, rodando dentro da moldura do celular —
 * SPEC 8.1, seção do mockup.
 *
 * Já foram três coisas neste lugar, e a progressão importa. Primeiro um mockup
 * montado à mão em HTML: honesto, mas uma **reconstrução**. Depois uma
 * gravação em vídeo: parecia a resposta, e não era — a gravação era de outro
 * produto, com a marca e a URL de outra empresa dentro do celular da nossa
 * landing. Agora é a página, rodando.
 *
 * Num bloco que se chama "é isto que ela vai abrir", e cujo texto manda a
 * pessoa **rolar** o celular, só a terceira versão não mente. Com o vídeo, o
 * convite a rolar era falso: não havia o que rolar. Aqui há.
 *
 * Três decisões, e nenhuma é enfeite:
 *
 * 1. **`loading="lazy"`.** O documento de dentro é uma página inteira. Pedir
 *    isso no load penalizaria o LCP da dobra de cima, que é onde a decisão
 *    começa. O navegador só busca quando a seção chega perto da viewport, sem
 *    nenhum JavaScript nosso para isso.
 * 2. **Inerte até tocar.** Um iframe rolável no meio de uma página captura o
 *    scroll de quem só queria passar por ele — no celular isso trava a
 *    navegação, e é o motivo pelo qual embed de mapa faz exatamente isto. Fica
 *    `inert` com o toque por cima; depois do toque, é a página, com tudo que
 *    ela faz.
 * 3. **O peso não entra no nosso bundle.** Documento separado, contexto de
 *    JavaScript separado: os ~118 KB da página publicada não somam nos 220 KB
 *    da landing (SPEC 10). Renderizar os mesmos blocos aqui dentro somaria — e
 *    é por isso que isto é um iframe e não um import.
 *
 * A rota é `/embed/[slug]`, que existe só para o exemplo e devolve 404 para
 * qualquer outro slug. O porquê está lá.
 */
export function PhoneDemo() {
  const [vivo, setVivo] = useState(false);

  return (
    <div className="phone-demo">
      <div className="phone-demo__device">
        <div className="phone-demo__screen">
          <iframe
            src={`/embed/${DEMO_SLUG}`}
            title={copy.showcase.demoLabel}
            loading="lazy"
            /* `inert` tira do foco e do ponteiro de uma vez; `pointer-events`
               sozinho ainda deixaria o Tab entrar no documento de dentro e o
               foco sumir da landing. */
            {...(vivo ? {} : { inert: true })}
            className="phone-demo__frame"
          />
        </div>

        {vivo ? null : (
          <button
            type="button"
            onClick={() => setVivo(true)}
            className="phone-demo__wake"
          >
            <span className="phone-demo__wake-pill">
              {copy.showcase.demoWake}
            </span>
          </button>
        )}
      </div>

      {/* Quem não puder com o iframe — extensão, navegador antigo — ainda tem
          o caminho inteiro para a página. `target="_blank"`: era a mesma
          aba, e clicar tirava a pessoa da landing sem aviso — ela perdia o
          lugar na página só para conferir o exemplo. Em aba nova ela nunca
          sai daqui. */}
      <a
        href={`/p/${DEMO_SLUG}`}
        target="_blank"
        rel="noopener noreferrer"
        className="phone-demo__full"
      >
        {copy.showcase.demoFull}
        <ExternalLink size={13} aria-hidden />
      </a>
    </div>
  );
}
