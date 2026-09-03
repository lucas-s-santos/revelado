"use client";

import { useActionState } from "react";

import {
  createTemplateAction,
  type TemplateFormState,
} from "@/app/admin/actions";
import { PALETTE_IDS } from "@/lib/palettes";
import { PLAN_IDS } from "@/lib/plans";
import { ICON_IDS } from "@/lib/templates";

const initialState: TemplateFormState = { ok: false, message: null };

export function TemplateForm() {
  const [state, formAction, pending] = useActionState(
    createTemplateAction,
    initialState,
  );

  return (
    <form action={formAction} className="fieldset max-w-sm">
      <div className="field">
        <label htmlFor="tpl-id" className="field__label">
          Identificador
        </label>
        <input
          id="tpl-id"
          name="id"
          required
          placeholder="minimalista"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="tpl-name" className="field__label">
          Nome
        </label>
        <input
          id="tpl-name"
          name="name"
          required
          placeholder="Minimalista"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="tpl-hint" className="field__label">
          Uma linha (card de escolha)
        </label>
        <input
          id="tpl-hint"
          name="hint"
          placeholder="só o essencial, sem enfeite"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="tpl-icon" className="field__label">
          Ícone
        </label>
        <select id="tpl-icon" name="icon" defaultValue="heart" className="input">
          {ICON_IDS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tpl-palette" className="field__label">
          Paleta
        </label>
        <select
          id="tpl-palette"
          name="palette"
          defaultValue="magenta"
          className="input"
        >
          {PALETTE_IDS.map((palette) => (
            <option key={palette} value={palette}>
              {palette}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tpl-font" className="field__label">
          Fonte
        </label>
        <select id="tpl-font" name="font" defaultValue="mixed" className="input">
          <option value="serif">serif</option>
          <option value="sans">sans</option>
          <option value="mixed">mixed</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="tpl-effect" className="field__label">
          Efeito
        </label>
        <select
          id="tpl-effect"
          name="effect"
          defaultValue="none"
          className="input"
        >
          <option value="none">nenhum</option>
          <option value="hearts">corações</option>
          <option value="confetti">confete</option>
          <option value="snow">neve</option>
          <option value="stars">estrelas</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="tpl-blocks" className="field__label">
          Blocos, em ordem
        </label>
        <input
          id="tpl-blocks"
          name="blocks"
          required
          placeholder="hero,counter,gallery,letter,footer"
          className="input"
        />
        <p className="field__hint">
          Separados por vírgula. Sempre começa em hero e termina em footer.
        </p>
      </div>

      <div className="field">
        <label htmlFor="tpl-plan" className="field__label">
          Plano exigido (opcional)
        </label>
        <select id="tpl-plan" name="planRequired" defaultValue="" className="input">
          <option value="">nenhum — todos os planos</option>
          {PLAN_IDS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tpl-preview" className="field__label">
          Imagem de prévia (opcional)
        </label>
        <input
          id="tpl-preview"
          name="previewUrl"
          placeholder="/templates/minimalista.webp"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="tpl-order" className="field__label">
          Ordem no seletor
        </label>
        <input
          id="tpl-order"
          name="order"
          type="number"
          min={0}
          defaultValue={10}
          className="input"
        />
      </div>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "field__hint" : "field__error"}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full justify-center"
      >
        {pending ? "Criando…" : "Criar template"}
      </button>
    </form>
  );
}
