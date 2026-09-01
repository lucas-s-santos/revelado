"use client";

import { useState } from "react";

import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Vídeo — SPEC 7.2.
 *
 * Três decisões, e as três vêm de regras que já existiam para a música:
 *
 * 1. **Nunca hospedar arquivo de vídeo.** A regra 10 do CLAUDE.md fala de
 *    música, mas o motivo é o mesmo e vale ainda mais aqui: banda, licença e
 *    custo por gigabyte. O schema tem `provider: "upload"` desde a fase 3;
 *    este componente não o desenha, e o editor não deixa criá-lo. Se um
 *    conteúdo antigo trouxer "upload", o bloco some da página em silêncio, em
 *    vez de mostrar um player quebrado.
 *
 * 2. **O iframe só entra no DOM depois do clique.** Antes disso a página não
 *    faz uma requisição sequer ao YouTube — nem script, nem cookie, nem a
 *    miniatura. Quem recebeu um presente não pediu para ser rastreado por
 *    terceiro, e o LCP agradece.
 *
 * 3. **Não toca junto com o portal.** A música entra sozinha quando o
 *    envelope abre, porque o toque no envelope já foi o gesto que o navegador
 *    exige. Vídeo não: se a página tiver os dois, começariam dois áudios
 *    juntos. Aqui o play é sempre da pessoa.
 */
export function VideoBlock({ props }: { props: PropsOf<"video"> }) {
  const [tocando, setTocando] = useState(false);

  // Ver a decisão 1. Sem provedor de embed, não há o que desenhar.
  if (props.provider !== "youtube" || props.ref.trim().length === 0) {
    return null;
  }

  if (!tocando) {
    return (
      <section className="block-video">
        <button
          type="button"
          onClick={() => setTocando(true)}
          className="block-video__capa"
        >
          <span aria-hidden className="block-video__play">
            <PlayIcon />
          </span>
          <span className="block-video__label">assistir ao vídeo</span>
        </button>
      </section>
    );
  }

  return (
    <section className="block-video is-playing">
      <iframe
        // `youtube-nocookie`: mesmo vídeo, sem o cookie de rastreio na
        // primeira visita. `rel=0` mantém as sugestões do fim dentro do
        // próprio canal, para a página não terminar oferecendo vídeo de
        // estranho a quem acabou de receber um presente.
        src={`https://www.youtube-nocookie.com/embed/${props.ref}?autoplay=1&rel=0`}
        title="Vídeo"
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="block-video__frame"
      />
    </section>
  );
}

/**
 * SVG inline, e não `lucide-react`.
 *
 * Mesmo motivo do ícone da música: um ícone só não paga o runtime da
 * biblioteca dentro do orçamento de 120 KB da página publicada (SPEC 10).
 */
function PlayIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
