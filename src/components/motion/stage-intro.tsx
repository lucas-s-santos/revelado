"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * Entrada coreografada da primeira dobra — SPEC 6.1 e 6.3.
 *
 * Por que GSAP e não o `Reveal` daqui do lado: o `Reveal` é uma revelação por
 * item, cada um com o seu observer e a sua transição de CSS. Serve para o que
 * chega rolando. A primeira dobra é outro problema — ela já está na tela no
 * primeiro frame e o que se quer ali é uma **sequência**, com as peças se
 * sobrepondo em tempos que se ajustam entre si. Isso é uma timeline, e é
 * exatamente o que o `Reveal` não sabe fazer.
 *
 * Regras que valem aqui:
 *
 * - **Só transform e opacity.** Nada de width/top/left: o que anima fica no
 *   compositor e não dispara layout (gsap-performance).
 * - **`gsap.matchMedia` para o reduced-motion**, não um `if` com o hook do
 *   projeto. A matchMedia reverte sozinha o que criou quando a preferência
 *   muda, e volta a montar quando muda de novo — um `if` só acerta o valor do
 *   primeiro render (CLAUDE.md, regra 14).
 * - **`gsap.from`, não `gsap.to`.** O estado final é o que está no HTML: sem
 *   JS, com JS quebrado ou antes da hidratação, a dobra aparece inteira e
 *   legível. Nada de conteúdo escondido por CSS esperando um script chegar.
 * - **Nenhum listener novo.** É uma timeline que roda uma vez na montagem;
 *   não assina scroll nem pointer, então a regra do listener único continua
 *   valendo (CLAUDE.md, regra 3).
 *
 * O `useGSAP` com `scope` limita os seletores a esta subárvore e reverte tudo
 * na desmontagem — inclusive os estilos inline que a timeline escreveu.
 */
export function StageIntro({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          anima: "(prefers-reduced-motion: no-preference)",
          quieto: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          // Sem movimento a dobra simplesmente já está pronta: o HTML é o
          // estado final, então não há nada a fazer.
          if (!context.conditions?.anima) return;

          const alvos = gsap.utils.toArray<HTMLElement>("[data-intro]");
          if (alvos.length === 0) return;

          // Ordena pelo número declarado no HTML em vez da ordem do DOM: no
          // desktop o mascote fica à direita, mas ele é a peça que entra
          // primeiro, e `order` do CSS não muda a ordem do documento.
          alvos.sort(
            (a, b) =>
              Number(a.dataset.intro ?? 0) - Number(b.dataset.intro ?? 0),
          );

          gsap
            .timeline({
              defaults: { ease: "power3.out", duration: 0.72 },
            })
            .from(alvos, {
              y: 18,
              autoAlpha: 0,
              // 80ms entre as peças: o mesmo compasso do stagger de 60ms do
              // Reveal, um respiro mais largo porque aqui são blocos, não
              // itens de uma lista.
              stagger: 0.08,
            })
            .from(
              "[data-intro-lead]",
              { scale: 0.94, duration: 0.9, ease: "power2.out" },
              // Começa junto com a primeira peça: é a mesma entrada, não uma
              // segunda animação em cima dela.
              0,
            );
        },
      );

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className={cn(className)}>
      {children}
    </div>
  );
}
