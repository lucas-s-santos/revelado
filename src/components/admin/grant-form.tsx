"use client";

import { useActionState } from "react";

import { grantFreeSiteAction, type GrantFormState } from "@/app/admin/actions";
import { PLANS } from "@/lib/plans";

const initialState: GrantFormState = { ok: false, message: null };

export function GrantForm() {
  const [state, formAction, pending] = useActionState(
    grantFreeSiteAction,
    initialState,
  );

  return (
    <form action={formAction} className="fieldset max-w-sm">
      <div className="field">
        <label htmlFor="slug" className="field__label">
          Link da página
        </label>
        <input
          id="slug"
          name="slug"
          required
          placeholder="nosso-xxxxxxxx"
          className="input"
        />
        <p className="field__hint">A parte depois de /p/ — sem o domínio.</p>
      </div>

      <div className="field">
        <label htmlFor="email" className="field__label">
          E-mail do casal
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="voce@email.com"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="planId" className="field__label">
          Plano
        </label>
        <select
          id="planId"
          name="planId"
          defaultValue="especial"
          className="input"
        >
          {PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
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
        {pending ? "Publicando…" : "Publicar de graça"}
      </button>
    </form>
  );
}
