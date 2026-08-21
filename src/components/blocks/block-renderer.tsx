import { registry } from "@/components/blocks/registry";
import { Reveal } from "@/components/motion/reveal";
import type { SiteContent } from "@/lib/blocks/schema";
import { cn } from "@/lib/utils";

/**
 * O renderer — SPEC 5.3, 8.8 e regra 2 do CLAUDE.md.
 *
 * **O MESMO componente no preview e na página publicada.** Zero duplicação: se
 * um bloco aparece diferente nos dois lugares, é bug, não recurso.
 *
 * Sem `"use client"`: em `/p/[slug]` isso roda no servidor e só os blocos
 * realmente interativos (contador, música) viram JavaScript no cliente. Quando o
 * editor importa este módulo, ele é compilado como client junto — mesmo código,
 * dois contextos.
 *
 * `mode` só muda o que é cosmético: no preview as revelações por scroll saem do
 * caminho, porque dentro do mockup de 40vh elas atrapalhariam a edição.
 */
export interface BlockRendererProps {
  content: SiteContent;
  mode: "preview" | "published";
  /** Date.now() do servidor: mantém contador igual no HTML e na hidratação */
  now?: number;
  /**
   * Mapa `mediaId → URL`, montado por `mediaMapFor`.
   *
   * Mapa e não função: em `/p/[slug]` este renderer roda no servidor e entrega
   * props para blocos que são Client Components (contador, música). Função não
   * atravessa essa fronteira — o React derruba o render inteiro.
   */
  media?: Record<string, string>;
  className?: string;
}

export function BlockRenderer({
  content,
  mode,
  now,
  media,
  className,
}: BlockRendererProps) {
  return (
    <div
      className={cn("blocks", className)}
      data-mode={mode}
      data-skin={content.theme.skin}
      data-palette={content.theme.palette}
      data-font={content.theme.font}
    >
      {content.blocks.map((block, index) => {
        const definition = registry[block.type];
        const Component = definition.component;

        // Bloco no schema mas ainda sem componente (V2, Fase 7): ignora em vez
        // de quebrar a página inteira. Página publicada não pode cair.
        if (!definition.ready || !Component) return null;

        const rendered = (
          <Component
            props={block.props}
            {...(now !== undefined ? { now } : {})}
            {...(media ? { media } : {})}
          />
        );

        // O mesmo wrapper nos dois modos — o DOM não muda de forma entre
        // preview e publicada. No preview ele só nasce visível.
        return (
          <Reveal
            key={block.id}
            index={index}
            animate={mode === "published"}
            className="blocks__item"
          >
            <div data-block={block.type}>{rendered}</div>
          </Reveal>
        );
      })}
    </div>
  );
}
