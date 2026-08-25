"use client";

import { useEditorStore } from "@/stores/editor-store";

/**
 * Passo de letra e efeito — SPEC 7.2 (`theme.font`, `theme.effect`).
 *
 * Saiu de dentro do passo de estilo quando a grade de temas entrou: os dois
 * juntos viravam uma tela longa demais para o celular, que é onde 90% do
 * público monta a página.
 *
 * O efeito é o único movimento ambiental da página publicada, e
 * `prefers-reduced-motion` desliga (regra 14) — por isso "Nenhum" vem primeiro
 * e é uma escolha legítima, não o estado de quem não decidiu.
 */

const FONTS = [
  {
    id: "mixed",
    label: "Misto",
    hint: "serifa no título, sem serifa no corpo",
  },
  { id: "serif", label: "Clássico", hint: "serifa em tudo" },
  { id: "sans", label: "Moderno", hint: "sem serifa em tudo" },
] as const;

const EFFECTS = [
  { id: "none", label: "Nenhum" },
  { id: "hearts", label: "Corações" },
  { id: "confetti", label: "Confete" },
  { id: "snow", label: "Neve" },
  { id: "stars", label: "Estrelas" },
] as const;

export function StepType() {
  const content = useEditorStore((state) => state.content);
  const setTheme = useEditorStore((state) => state.setTheme);

  if (!content) return null;

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">A letra e o movimento</h2>
        <p className="step__lede">Detalhe pequeno, diferença grande.</p>
      </header>

      <fieldset className="fieldset">
        <legend className="field__label">Letra</legend>
        <div className="chips">
          {FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => setTheme({ font: font.id })}
              aria-pressed={content.theme.font === font.id}
              className="chip"
            >
              <span>{font.label}</span>
              <small>{font.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="field__label">Efeito de fundo</legend>
        <div className="chips">
          {EFFECTS.map((effect) => (
            <button
              key={effect.id}
              type="button"
              onClick={() => setTheme({ effect: effect.id })}
              aria-pressed={content.theme.effect === effect.id}
              className="chip"
            >
              <span>{effect.label}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
