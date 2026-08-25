"use client";

import { getPalette } from "@/lib/palettes";
import { isThemeUnlocked, THEMES } from "@/lib/themes";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Passo de tema — a cor e o fundo da página (SPEC 7.2, `theme`).
 *
 * A pele e a paleta deixaram de ser dois seletores separados e viraram uma
 * grade de temas nomeados. Ninguém escolhe "pele clara + accent selênio";
 * escolhe "Selênio". Por baixo continua sendo skin × palette, então nada muda
 * no CSS nem na regra 6.
 *
 * O tema ativo é **derivado** de skin + palette, não guardado: assim a grade
 * entrou sem migração de conteúdo e rascunho antigo continua abrindo.
 *
 * Os três temas travados aparecem, mas não selecionam. Deixar escolher sem o
 * checkout cobrar seria prometer o que o sistema não entrega — quando a
 * cobrança existir (fase E), eles passam a selecionar com aviso.
 */
export function StepTheme() {
  const content = useEditorStore((state) => state.content);
  const setTheme = useEditorStore((state) => state.setTheme);

  if (!content) return null;

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">O clima da página</h2>
        <p className="step__lede">Veja no celular ao lado — muda na hora.</p>
      </header>

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
                <i
                  style={{
                    background: `rgb(${getPalette(theme.palette).accent})`,
                  }}
                />
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
    </div>
  );
}
