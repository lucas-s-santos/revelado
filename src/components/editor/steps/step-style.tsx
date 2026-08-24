"use client";

import { getPalette } from "@/lib/palettes";
import { isThemeUnlocked, THEMES } from "@/lib/themes";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Passo de estilo — tema, letra e efeito (SPEC 7.2, `theme`).
 *
 * A pele e a cor deixaram de ser dois seletores separados e viraram uma grade
 * de temas nomeados. Ninguém escolhe "pele clara + accent selênio"; escolhe
 * "Selênio". Por baixo continua sendo skin × palette, então nada muda no CSS.
 *
 * O tema ativo é **derivado** de skin + palette, não guardado: assim a grade
 * entra sem migração de conteúdo e rascunho antigo continua abrindo.
 *
 * Os três temas travados aparecem, mas não selecionam. Deixar escolher sem o
 * checkout cobrar seria prometer o que o sistema não entrega — quando a
 * cobrança existir (fase E), eles passam a selecionar com aviso.
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

      <fieldset className="fieldset">
        <legend className="field__label">Tema</legend>

        <div className="themes">
          {THEMES.map((theme) => {
            const ativo =
              content.theme.skin === theme.skin &&
              content.theme.palette === theme.palette;
            // Ainda não há plano escolhido no editor: só os livres contam.
            const livre = isThemeUnlocked(theme, null);

            return (
              <button
                key={theme.id}
                type="button"
                disabled={!livre}
                onClick={() =>
                  setTheme({ skin: theme.skin, palette: theme.palette })
                }
                aria-pressed={ativo}
                className="theme-tile"
                data-skin={theme.skin}
                data-locked={!livre || undefined}
              >
                <span aria-hidden className="theme-tile__chip">
                  <i style={{ background: `rgb(${getPalette(theme.palette).accent})` }} />
                </span>

                <span className="theme-tile__name">{theme.name}</span>
                <small className="theme-tile__hint">{theme.hint}</small>

                {!livre ? (
                  <span className="theme-tile__lock">no Especial</span>
                ) : null}
              </button>
            );
          })}
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
