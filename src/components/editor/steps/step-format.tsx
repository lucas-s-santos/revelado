"use client";

import { Check } from "lucide-react";

import { getBlockDefinition, readyBlockTypes } from "@/components/blocks/registry";
import { isTemplateReady, TEMPLATES } from "@/lib/templates";
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

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.id)}
              aria-pressed={ativo}
              className="format"
            >
              <span className="format__head">
                <span className="format__name">{template.name}</span>
                {ativo ? (
                  <span aria-hidden className="format__mark">
                    <Check size={14} />
                  </span>
                ) : null}
              </span>

              <span className="format__hint">{template.hint}</span>

              {/* Rótulo do registry, nunca o nome do tipo: "Capa · Contador",
                  não "hero · counter". Nomeie pelo que a pessoa reconhece
                  (SPEC 11). O rodapé fica de fora porque toda página tem. */}
              <span className="format__blocks">
                {template.preset.blocks
                  .filter((type) => type !== "footer")
                  .map((type) => getBlockDefinition(type).label)
                  .join(" · ")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
