"use client";

import { PALETTES, SKINS } from "@/lib/palettes";
import { useEditorStore } from "@/stores/editor-store";

/** Passo 5 — Estilo. Paleta, fonte e efeito (SPEC 7.2, `theme`). */

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

export function StepStyle() {
  const content = useEditorStore((state) => state.content);
  const setTheme = useEditorStore((state) => state.setTheme);

  if (!content) return null;

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">O clima da página</h2>
        <p className="step__lede">Veja no celular ao lado — muda na hora.</p>
      </header>

      {/* A pele vem antes da cor de propósito: ela troca o fundo inteiro, e
          escolher o acento antes seria escolher no escuro. */}
      <fieldset className="fieldset">
        <legend className="field__label">Fundo</legend>
        <div className="chips">
          {SKINS.map((skin) => (
            <button
              key={skin.id}
              type="button"
              onClick={() => setTheme({ skin: skin.id })}
              aria-pressed={content.theme.skin === skin.id}
              className="chip"
            >
              <span>{skin.name}</span>
              <small>{skin.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="field__label">Cor</legend>
        <div className="swatches">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              type="button"
              onClick={() => setTheme({ palette: palette.id })}
              aria-pressed={content.theme.palette === palette.id}
              aria-label={palette.name}
              title={palette.name}
              className="swatch"
              style={{ background: `rgb(${palette.accent})` }}
            />
          ))}
        </div>
      </fieldset>

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
