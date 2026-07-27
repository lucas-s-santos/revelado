"use client";

import { useEditorStore } from "@/stores/editor-store";

/**
 * Indicador de salvamento — SPEC 8.4: "indicador discreto 'salvo'".
 *
 * Discreto quando dá certo, claro quando dá errado. O erro diz o que aconteceu
 * e garante que nada se perdeu, porque é exatamente isso que a pessoa teme
 * (SPEC 11).
 */
export function SaveIndicator() {
  const saveState = useEditorStore((state) => state.saveState);
  const saveError = useEditorStore((state) => state.saveError);

  if (saveState === "error") {
    return (
      <p role="alert" className="save-indicator is-error">
        {saveError ?? "Não deu para salvar."} Seu texto continua aqui — vamos
        tentar de novo sozinhos.
      </p>
    );
  }

  const label =
    saveState === "saving"
      ? "salvando…"
      : saveState === "dirty"
        ? "com alterações"
        : saveState === "saved"
          ? "salvo"
          : "tudo salvo";

  return (
    <p className="save-indicator" data-state={saveState}>
      <span aria-hidden className="save-indicator__dot" />
      {label}
    </p>
  );
}
