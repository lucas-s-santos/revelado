"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PhoneFrame } from "@/components/preview/phone-frame";
import { track } from "@/lib/analytics";
import type { SiteContent } from "@/lib/blocks/schema";
import type { OccasionId } from "@/lib/occasions";

/**
 * Escolha do template — SPEC 8.3.
 *
 * "6 a 8 templates em mockup de celular, com **preview real (não imagem
 * estática)**": cada card é o `BlockRenderer` de verdade dentro do `PhoneFrame`,
 * com o mesmo conteúdo que o rascunho vai nascer. O que a pessoa vê aqui é o que
 * ela recebe — se divergir, é bug (regra inviolável 2).
 *
 * O preview não é interativo: dentro de um card de 230px, contador correndo e
 * carrossel arrastável só atrapalhariam o toque que interessa, que é escolher.
 */

export interface TemplateOption {
  id: string;
  slug: string;
  name: string;
  description: string;
  planRequired: string | null;
  /** já montado no servidor: o preview é o conteúdo real */
  preview: SiteContent;
}

export function TemplatePicker({
  occasion,
  templates,
  now,
}: {
  occasion: OccasionId;
  templates: TemplateOption[];
  /** `Date.now()` do servidor, para o contador não divergir na hidratação */
  now: number;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(template: TemplateOption) {
    if (creating) return;

    setCreating(template.slug);
    setError(null);
    void track("template_selected", {
      occasion,
      template: template.id,
    });

    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion, template: template.slug }),
      });

      if (!response.ok) throw new Error();

      const draft = (await response.json()) as { id: string };
      router.push(`/editor/${draft.id}`);
    } catch {
      setCreating(null);
      setError(
        "Não deu para começar sua página agora. Verifique a conexão e toque de novo.",
      );
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="create-page__error">
          {error}
        </p>
      ) : null}

      <ul className="template-grid">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => void choose(template)}
              disabled={creating !== null}
              aria-busy={creating === template.slug}
              className="template-card"
            >
              {/* `inert` e não `aria-hidden`: o preview é o BlockRenderer de
                  verdade, e ele traz links e botões dentro (o rodapé, a música).
                  Só esconder do leitor de tela deixava elementos focáveis dentro
                  de algo marcado como oculto, e interativos dentro de um
                  <button> — duas violações de WCAG que o axe pegou. `inert` tira
                  a subárvore do foco e da árvore de acessibilidade de uma vez. */}
              <span className="template-card__preview" inert>
                {/* Sem `scale`: a miniatura é resolvida no CSS por transform,
                    para a tipografia manter a proporção da página real. */}
                <PhoneFrame
                  content={template.preview}
                  interactive={false}
                  now={now}
                />
              </span>

              <span className="template-card__body">
                <span className="template-card__name">
                  {template.name}
                  {template.planRequired ? (
                    <span className="template-card__plan">
                      no {template.planRequired}
                    </span>
                  ) : null}
                </span>

                <span className="template-card__desc">
                  {template.description}
                </span>

                <span className="template-card__cta">
                  {creating === template.slug ? "criando…" : "usar este →"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
