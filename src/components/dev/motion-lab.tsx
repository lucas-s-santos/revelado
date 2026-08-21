"use client";

import { useRef, useState } from "react";

import { DriverStats } from "@/components/dev/driver-stats";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { Safelight } from "@/components/motion/safelight";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { StickyActs } from "@/components/motion/sticky-acts";
import { ScrollProgress } from "@/components/chrome/scroll-progress";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Frame } from "@/components/ui/frame";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { Spotlight } from "@/components/ui/spotlight-new";
import { Button as StatefulButton } from "@/components/ui/stateful-button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSectionProgress } from "@/hooks/use-section-progress";
import { MOMENTS } from "@/lib/moments";
import { PALETTES } from "@/lib/palettes";

/**
 * Troca o accent do documento inteiro.
 *
 * Só a bancada faz isso: na aplicação de verdade, `data-palette` fica no
 * contêiner da página publicada, nunca no `documentElement` (ver theme.css).
 * Aqui o ponto é justamente ver os componentes em todas as paletas de uma vez.
 */
function setAccent(paletteId: string) {
  document.documentElement.dataset.palette = paletteId;
}

export function MotionLab() {
  const reduced = useReducedMotion();

  return (
    <>
      <ScrollProgress />
      <Safelight />
      <DriverStats />

      <main className="container-page relative flex flex-col gap-40 py-24">
        <Hero />
        <Cards />
        <Numbers />
        <Faixa />
        <Grid />
        <Acts />
        <Revelacao />
        <Estado reduced={reduced} />
      </main>
    </>
  );
}

function Section({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">{n}</p>
        <h2 className="text-[clamp(1.75rem,4vw,2.5rem)]">{title}</h2>
        <p className="max-w-[62ch] text-sm text-[rgb(var(--color-ink-muted))]">
          {note}
        </p>
      </header>
      {children}
    </section>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[70vh] flex-col justify-center gap-6 overflow-hidden">
      <Spotlight />

      <p className="eyebrow">Fase 1 · camada de motion</p>
      <h1 className="text-[clamp(2.5rem,8vw,5rem)]">
        Laboratório <span className="display-italic">de motion</span>
      </h1>
      <p className="max-w-[52ch] text-[rgb(var(--color-ink-muted))]">
        Cada hook e cada componente da seção 6 do SPEC, num lugar só. Mexa o
        ponteiro: a safelight segue. Role: um único listener responde por tudo.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <Magnetic>
          <button
            type="button"
            className="rounded-pill bg-[rgb(var(--color-accent))] px-6 py-3 font-medium text-[rgb(var(--color-bg))] transition-shadow hover:shadow-(--shadow-glow)"
          >
            Botão magnético
          </button>
        </Magnetic>

        <StatefulButton
          onClick={() => new Promise((resolve) => setTimeout(resolve, 1200))}
        >
          Stateful
        </StatefulButton>
      </div>
    </section>
  );
}

function Cards() {
  const [accent, setAccentName] = useState(PALETTES[0]?.name ?? "");

  return (
    <Section
      n="01 · SpotlightCard + accent dinâmico"
      title="O halo segue o ponteiro"
      note="O card escreve --sx/--sy em si mesmo, sem re-render, e só assina o driver enquanto o ponteiro está dentro. Passar o ponteiro troca --color-accent do documento inteiro: é um gesto só da bancada, para conferir os componentes em todas as paletas."
    >
      <p className="text-sm">
        accent atual: <strong>{accent}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PALETTES.map((palette) => (
          <div
            key={palette.id}
            onPointerEnter={() => {
              setAccent(palette.id);
              setAccentName(palette.name);
            }}
          >
            <SpotlightCard className="h-full p-5">
              <p className="eyebrow mb-2">paleta</p>
              <p className="text-lg">{palette.name}</p>
              <p
                data-numeric
                className="mt-1 text-xs text-[rgb(var(--color-ink-muted))]"
              >
                {palette.accent}
              </p>
            </SpotlightCard>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Numbers() {
  return (
    <Section
      n="02 · Number Ticker · Border Beam · Shine Border"
      title="Componentes de biblioteca, retematizados"
      note="Magic UI com os tokens da seção 4: o beam vai de accent a magenta, o shine acompanha o accent, o ticker é mono com tabular-nums e formata em pt-BR."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass relative overflow-hidden p-6">
          <p className="eyebrow mb-2">páginas criadas</p>
          <p className="text-4xl">
            <NumberTicker value={1482} />
          </p>
          <BorderBeam size={70} duration={7} />
        </div>

        <div className="glass relative overflow-hidden p-6">
          <p className="eyebrow mb-2">plano em destaque</p>
          <p className="text-4xl">
            R$ <NumberTicker value={34} />
            ,90
          </p>
          <ShineBorder />
        </div>

        <div className="glass p-6">
          <p className="eyebrow mb-2">sem efeito</p>
          <p className="text-4xl">
            <NumberTicker value={97} decimalPlaces={1} />%
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--color-ink-muted))]">
            Máximo dois efeitos ambientais por dobra (SPEC 6.1).
          </p>
        </div>
      </div>
    </Section>
  );
}

function Faixa() {
  return (
    <Section
      n="03 · Marquee"
      title="Faixa de momentos"
      note="Pausa no hover. Some inteiro em prefers-reduced-motion."
    >
      <Marquee pauseOnHover className="[--duration:26s]">
        {MOMENTS.map((moment) => (
          <span
            key={moment.id}
            className="glass mx-2 px-5 py-2.5 text-sm whitespace-nowrap"
          >
            <span
              aria-hidden
              className="mr-2 inline-block size-2 rounded-full align-middle"
              style={{ background: "rgb(var(--color-accent))" }}
            />
            {moment.label}
          </span>
        ))}
      </Marquee>
    </Section>
  );
}

function Grid() {
  return (
    <Section
      n="04 · Blur Fade + Reveal + Frame"
      title="Entrada escalonada"
      note="Blur Fade nos grids; Reveal nos blocos, com stagger de 60ms e once: true — nada re-anima ao rolar de volta. O Frame traz grão e vinheta."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <BlurFade key={i} delay={0.1 + i * 0.08} inView>
            <Frame ratio="4/5">
              <span className="eyebrow">foto {i + 1}</span>
            </Frame>
          </BlurFade>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {["Primeiro bloco", "Segundo bloco", "Terceiro bloco"].map(
          (label, i) => (
            <Reveal key={label} index={i}>
              <div className="glass px-5 py-4">{label}</div>
            </Reveal>
          ),
        )}
      </div>
    </Section>
  );
}

function Acts() {
  return (
    <Section
      n="05 · StickyActs"
      title="Como funciona, em três atos"
      note="O trilho preenche com scaleY(--p) e cada ato acende quando o progresso cruza a faixa dele. O hook escreve uma custom property; o resto é CSS."
    >
      <StickyActs
        acts={[
          {
            eyebrow: "ato um",
            title: "Escolha as fotos",
            text: "As que já estão no celular. Arraste para ordenar e escreva a legenda.",
          },
          {
            eyebrow: "ato dois",
            title: "Monte a página",
            text: "Fotos, mensagem, música e contador. O preview atualiza enquanto você digita.",
          },
          {
            eyebrow: "ato três",
            title: "Pague e presenteie",
            text: "Pix, link e QR Code para imprimir. Pronto em menos de oito minutos.",
          },
        ]}
      />
    </Section>
  );
}

function Revelacao() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useSectionProgress(ref, { enabled: !reduced });

  return (
    <Section
      n="06 · useSectionProgress — a assinatura"
      title="As fotos revelam conforme você rola"
      note="De saturate(.06) blur(5px) para nítidas, com stagger. O hook escreve --p no contêiner e o filtro inteiro resolve em CSS: zero JavaScript por frame."
    >
      <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="developing"
            style={{ "--i": i } as React.CSSProperties}
          >
            <Frame ratio="3/4">
              <span className="eyebrow">revelando</span>
            </Frame>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Estado({ reduced }: { reduced: boolean }) {
  return (
    <Section
      n="07 · prefers-reduced-motion"
      title={reduced ? "Ligado — motion desligado" : "Desligado"}
      note="Regra 5 da seção 6.1: não é opcional. Com a preferência ligada, safelight, parallax, revelações e marquee saem do ar. Teste em DevTools → Rendering → Emulate prefers-reduced-motion."
    >
      <p
        data-numeric
        className={
          reduced
            ? "text-[rgb(var(--color-cyan))]"
            : "text-[rgb(var(--color-ink-muted))]"
        }
      >
        prefers-reduced-motion: {reduced ? "reduce" : "no-preference"}
      </p>
    </Section>
  );
}
