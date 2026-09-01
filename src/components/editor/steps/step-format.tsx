"use client";

import {
  Check,
  Heart,
  ListOrdered,
  Lock,
  Sparkles,
  Milestone,
  type LucideIcon,
} from "lucide-react";

import { readyBlockTypes } from "@/components/blocks/registry";
import { isTemplateReady, TEMPLATES, type TemplateSeed } from "@/lib/templates";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Passo de formato — o primeiro (SPEC 8.3).
 *
 * O formato é a moldura: que blocos a página tem e em que ordem. O rascunho
 * nasce com um, e aqui a pessoa troca.
 *
 * A lista é FILTRADA por `isTemplateReady`. Dois presets pedem blocos que
 * ainda não têm componente — o renderer ignora bloco sem componente, em
 * silêncio, então oferecê-los entregaria uma página onde a peça principal
 * simplesmente não aparece. Quando esses blocos existirem, os formatos entram
 * sozinhos, sem ninguém lembrar de mexer aqui.
 *
 * Trocar não apaga nada: `applyTemplate` reordena os blocos que já existem em
 * vez de recriá-los, e o que o formato novo não pede continua na página.
 */
export function StepFormat() {
  const content = useEditorStore((state) => state.content);
  const applyTemplate = useEditorStore((state) => state.applyTemplate);

  if (!content) return null;

  const disponiveis = TEMPLATES.filter((template) =>
    isTemplateReady(template, readyBlockTypes),
  );

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">Que formato tem esse presente?</h2>
        <p className="step__lede">
          É a moldura: o que entra na página e em que ordem. Pode trocar quando
          quiser — o que você escrever fica.
        </p>
      </header>

      <div className="formats">
        {disponiveis.map((template) => {
          const ativo = content.theme.template === template.id;

          const Icone = ICONES[template.icon];

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.id)}
              aria-pressed={ativo}
              className="format"
            >
              {/* O selo do plano vem antes do nome: é a informação que muda
                    a decisão, e depois de escolher já é tarde. */}
              {template.planRequired ? (
                <span className="format__plano">plano eterno</span>
              ) : null}

              <span aria-hidden className="format__icone">
                <Icone size={18} />
              </span>

              <span className="format__name">{template.name}</span>
              <span className="format__hint">{template.hint}</span>

              {ativo ? (
                <span aria-hidden className="format__mark">
                  <Check size={13} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nome declarado no template → componente. O template não importa React. */
const ICONES: Record<TemplateSeed["icon"], LucideIcon> = {
  heart: Heart,
  sparkles: Sparkles,
  timeline: Milestone,
  list: ListOrdered,
  lock: Lock,
};
