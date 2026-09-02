"use client";

import { useEffect, useRef, useState } from "react";

import { useReveal } from "@/hooks/use-reveal";

/**
 * Um cartão de `MoodReel` — pôster até o toque, vídeo só depois.
 *
 * Mesmo idioma de `video-block.tsx`: nada de rede nem de decodificador de
 * vídeo entra antes do gesto da pessoa. Isto não é uma escolha de estilo —
 * é o que faz três clipes de ~3 MB cada não custarem nada a quem só rolou a
 * página até aqui e não pediu para ver nenhum.
 *
 * Depois que toca, o vídeo entra em loop — e pausa sozinho se a pessoa rolar
 * a seção para fora da tela (`useReveal` com `once: false`, o mesmo padrão
 * que o antigo `hero-demo.mp4` usava): vídeo tocando fora de vista é bateria
 * gasta para ninguém.
 */
export function MoodCard({
  id,
  tag,
  demoLabel,
}: {
  id: string;
  tag: string;
  demoLabel: string;
}) {
  const [tocando, setTocando] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const { ref, visible } = useReveal<HTMLDivElement>({
    once: false,
    amount: 0.3,
  });

  // `autoPlay` só é lido na montagem — não reage a props depois. Pausar de
  // verdade ao sair da tela exige chamar play()/pause() à mão quando
  // `visible` muda, o mesmo padrão do antigo player de hero-demo.mp4.
  useEffect(() => {
    const node = video.current;
    if (!node || !tocando) return;
    if (visible) void node.play().catch(() => undefined);
    else node.pause();
  }, [visible, tocando]);

  return (
    <figure ref={ref} className="mood-card">
      {tocando ? (
        <video
          ref={video}
          className="mood-card__media"
          poster={`/mood/${id}.webp`}
          muted
          loop
          playsInline
          autoPlay
          aria-label={tag}
        >
          <source src={`/mood/${id}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <button
          type="button"
          className="mood-card__wake"
          onClick={() => setTocando(true)}
        >
          <picture>
            <source srcSet={`/mood/${id}.avif`} type="image/avif" />
            <img
              src={`/mood/${id}.webp`}
              alt=""
              className="mood-card__media"
              loading="lazy"
              decoding="async"
            />
          </picture>

          <span aria-hidden className="mood-card__play">
            <PlayIcon />
          </span>
        </button>
      )}

      <figcaption className="mood-card__caption">
        <span>{tag}</span>
        <span className="mood-card__demo">{demoLabel}</span>
      </figcaption>
    </figure>
  );
}

/** SVG inline pelo mesmo motivo do `video-block.tsx`: um ícone só não paga o
 *  runtime do lucide-react no orçamento da landing. */
function PlayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
