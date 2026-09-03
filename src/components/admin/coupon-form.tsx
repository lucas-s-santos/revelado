"use client";

import { useActionState } from "react";

import { createCouponAction, type CouponFormState } from "@/app/admin/actions";

const initialState: CouponFormState = { ok: false, message: null };

export function CouponForm() {
  const [state, formAction, pending] = useActionState(
    createCouponAction,
    initialState,
  );

  return (
    <form action={formAction} className="fieldset max-w-sm">
      <div className="field">
        <label htmlFor="code" className="field__label">
          Código
        </label>
        <input
          id="code"
          name="code"
          required
          placeholder="PRIMEIRA"
          className="input"
          style={{ textTransform: "uppercase" }}
        />
      </div>

      <div className="field">
        <label htmlFor="type" className="field__label">
          Tipo
        </label>
        <select id="type" name="type" defaultValue="percent" className="input">
          <option value="percent">Percentual</option>
          <option value="fixed">Valor fixo</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="value" className="field__label">
          Valor
        </label>
        <input
          id="value"
          name="value"
          type="number"
          min={1}
          required
          placeholder="15"
          className="input"
        />
        <p className="field__hint">
          Percentual: 1 a 100. Valor fixo: em centavos (1000 = R$ 10,00).
        </p>
      </div>

      <div className="field">
        <label htmlFor="maxUses" className="field__label">
          Limite de usos (opcional)
        </label>
        <input
          id="maxUses"
          name="maxUses"
          type="number"
          min={1}
          placeholder="sem limite"
          className="input"
        />
      </div>

      <div className="field">
        <label htmlFor="validUntil" className="field__label">
          Válido até (opcional)
        </label>
        <input id="validUntil" name="validUntil" type="date" className="input" />
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
        {pending ? "Criando…" : "Criar cupom"}
      </button>
    </form>
  );
}
