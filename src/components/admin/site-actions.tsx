"use client";

import { useActionState } from "react";

import {
  renameSiteSlugAction,
  resendEmailAction,
  type RenameFormState,
  type ResendFormState,
} from "@/app/admin/actions";

const renameInitial: RenameFormState = { ok: false, message: null };
const resendInitial: ResendFormState = { ok: false, message: null };

/**
 * O que precisa de feedback de tela (trocar link, reenviar e-mail) — o
 * resto (indexável, excluir) são formulários simples direto no Server
 * Component, sem estado nenhum para gerenciar.
 */
export function SiteActions({
  id,
  slug,
  published,
}: {
  id: string;
  slug: string;
  published: boolean;
}) {
  const [renameState, renameAction, renaming] = useActionState(
    renameSiteSlugAction,
    renameInitial,
  );
  const [resendState, resendActionFn, resending] = useActionState(
    resendEmailAction,
    resendInitial,
  );

  return (
    <div className="site-actions">
      {published ? (
        <form action={resendActionFn} className="site-actions__inline">
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={resending} className="btn-quiet">
            {resending ? "Enviando…" : "Reenviar e-mail"}
          </button>
        </form>
      ) : (
        <form action={renameAction} className="site-actions__inline">
          <input type="hidden" name="id" value={id} />
          <input
            name="apelido"
            defaultValue={slug.replace(/-[a-z0-9]{8}$/, "")}
            placeholder="novo-começo-do-link"
            className="input"
          />
          <button type="submit" disabled={renaming} className="btn-quiet">
            {renaming ? "Salvando…" : "Trocar link"}
          </button>
        </form>
      )}

      {resendState.message ? (
        <p
          role={resendState.ok ? "status" : "alert"}
          className={resendState.ok ? "field__hint" : "field__error"}
        >
          {resendState.message}
        </p>
      ) : null}
      {renameState.message ? (
        <p
          role={renameState.ok ? "status" : "alert"}
          className={renameState.ok ? "field__hint" : "field__error"}
        >
          {renameState.message}
        </p>
      ) : null}
    </div>
  );
}
