"use client";

import { useActionState } from "react";

import { updatePlanAction, type PlanFormState } from "@/app/admin/actions";
import type { AdminPlanSummary } from "@/lib/plans-db";

const initialState: PlanFormState = { ok: false, message: null };

/** Um card de edição por plano — nunca criação (ver a nota em `lib/plans.ts`). */
export function PlanForm({ plan }: { plan: AdminPlanSummary }) {
  const [state, formAction, pending] = useActionState(
    updatePlanAction,
    initialState,
  );

  return (
    <form action={formAction} className="fieldset max-w-sm">
      <input type="hidden" name="id" value={plan.id} />

      <p className="field__label">{plan.name}</p>

      <div className="field">
        <label htmlFor={`${plan.id}-price`} className="field__label">
          Preço (centavos)
        </label>
        <input
          id={`${plan.id}-price`}
          name="priceCents"
          type="number"
          min={1}
          required
          defaultValue={plan.priceCents}
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor={`${plan.id}-list`} className="field__label">
          Preço &quot;de&quot;, riscado (centavos)
        </label>
        <input
          id={`${plan.id}-list`}
          name="listCents"
          type="number"
          min={1}
          required
          defaultValue={plan.listCents}
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor={`${plan.id}-hint`} className="field__label">
          Uma linha (card da vitrine)
        </label>
        <input
          id={`${plan.id}-hint`}
          name="hint"
          defaultValue={plan.hint}
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor={`${plan.id}-features`} className="field__label">
          Recursos, um por linha
        </label>
        <textarea
          id={`${plan.id}-features`}
          name="features"
          required
          defaultValue={plan.features.join("\n")}
          className="input input--area"
        />
      </div>

      <div className="field">
        <label htmlFor={`${plan.id}-missing`} className="field__label">
          O que não tem, um por linha (opcional)
        </label>
        <textarea
          id={`${plan.id}-missing`}
          name="missing"
          defaultValue={plan.missing?.join("\n") ?? ""}
          className="input input--area"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="highlight"
          defaultChecked={plan.highlight}
        />
        Destacado na vitrine
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={plan.active} />
        Ativo (aparece no checkout)
      </label>

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
        {pending ? "Salvando…" : "Salvar plano"}
      </button>
    </form>
  );
}
