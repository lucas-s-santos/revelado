"use client";

import { Marquee } from "@/components/ui/marquee";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { copy } from "@/lib/copy";
import { MOMENTS } from "@/lib/moments";

/**
 * Faixa dos momentos do casal — SPEC 8.1 seção 4 e 6.3 (pausar no hover).
 *
 * Era a faixa das oito ocasiões. Agora não oferece escolha nenhuma: só mostra
 * que a mesma página serve do primeiro mês às bodas. Por isso os itens não são
 * links — quem clica em qualquer um cairia no mesmo editor.
 *
 * Em `prefers-reduced-motion` vira uma lista estática, não some: o conteúdo é
 * informação, só o movimento é decoração (SPEC 11).
 */
export function MomentsMarquee() {
  const reduced = useReducedMotion();

  const chips = MOMENTS.map((moment) => (
    <span key={moment.id} className="moment-chip">
      {moment.label}
    </span>
  ));

  return (
    <section className="py-6" aria-label={copy.marquee.eyebrow}>
      {reduced ? (
        <ul className="container-page flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>{chip}</li>
          ))}
        </ul>
      ) : (
        <Marquee pauseOnHover className="[--duration:34s] [--gap:0.75rem]">
          {chips}
        </Marquee>
      )}
    </section>
  );
}
