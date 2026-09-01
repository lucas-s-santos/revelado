"use client";

import { useEffect, useState } from "react";

import { useAbertura } from "@/components/blocks/portal";
import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Música — SPEC 7.2, 8.8 e 9.4.
 *
 * Duas regras que não se negociam:
 *  - **nunca hospedar áudio** (anti-padrão 9). Só embed oficial do Spotify ou do
 *    YouTube — a licença é deles;
 *  - só toca depois de um gesto do usuário (política de autoplay do navegador).
 *    Por isso o iframe só entra no DOM depois do clique: antes disso a página
 *    publicada não carrega nada de terceiro, o que também ajuda o LCP.
 */
export function MusicBlock({ props }: { props: PropsOf<"music"> }) {
  const [playing, setPlaying] = useState(false);
  const aberto = useAbertura();

  /*
   * Quando a página abre pelo portal, a música entra junto.
   *
   * Não é autoplay burlando a política do navegador: o gesto que ela exige já
   * aconteceu, e foi o toque no envelope. Aqui só reaproveitamos esse gesto,
   * que é exatamente o motivo do portal existir.
   *
   * No preview do editor não há portal, a abertura vale falso, e o bloco
   * continua pedindo o clique dele. Quem está montando a página não quer
   * música começando sozinha a cada troca de etapa.
   */
  useEffect(() => {
    if (aberto) setPlaying(true);
  }, [aberto]);

  /* `start` só no YouTube: é o embed dele que aceita o parâmetro. No Spotify
   * o iframe simples sempre começa do zero — pular para um trecho lá exigiria
   * o SDK da IFrame API deles, que este projeto não carrega. */
  const inicio = props.startSec > 0 ? `&start=${props.startSec}` : "";

  const src =
    props.provider === "spotify"
      ? `https://open.spotify.com/embed/track/${props.trackId}?utm_source=revelado`
      : `https://www.youtube.com/embed/${props.trackId}?autoplay=1&rel=0${inicio}`;

  const label =
    props.provider === "spotify" ? "Ouvir no Spotify" : "Ouvir no YouTube";

  if (!playing) {
    return (
      <section className="block-music">
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="block-music__play"
        >
          <MusicIcon />
          {label}
        </button>
        <p className="block-music__hint">a nossa música</p>
      </section>
    );
  }

  return (
    <section className="block-music is-playing">
      <iframe
        src={src}
        title={label}
        loading="lazy"
        allow="autoplay; encrypted-media; clipboard-write"
        className="block-music__frame"
      />
    </section>
  );
}

/**
 * SVG inline em vez do `lucide-react`.
 *
 * Um ícone só não justifica arrastar o runtime da biblioteca para a página
 * publicada: ele custava ~4 KB gzip do orçamento de 120 KB (SPEC 10). Nos blocos
 * o ícone é inline; no editor e na landing o lucide segue valendo, porque lá são
 * dezenas de ícones e o orçamento é outro.
 */
function MusicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
