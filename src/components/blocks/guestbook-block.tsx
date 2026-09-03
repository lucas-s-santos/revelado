"use client";

import { useState } from "react";

import type { PropsOf } from "@/lib/blocks/schema";
import type { GuestbookPublicEntry } from "@/lib/guestbook";
import { formatDate } from "@/lib/utils";

/**
 * Mural de recados — SPEC 8.9. O único bloco cujo conteúdo não mora no JSON
 * da página: os recados vivem em `GuestbookEntry`, à parte, porque não são a
 * pessoa que monta a página escrevendo — são quem visita.
 *
 * `guestbook` é passado por `BlockRenderer`, do mesmo jeito que `media` —
 * quem resolve os dados é o servidor (`/p/[slug]/page.tsx`), nunca este
 * componente. No preview do editor não existe recado de verdade (a página
 * nem está no ar ainda), então `guestbook` some e o bloco mostra o convite
 * vazio mais um aviso de que aqui é só prévia.
 *
 * "use client": tem formulário que fala com `/api/guestbook`.
 */
export function GuestbookBlock({
  props,
  guestbook,
}: {
  props: PropsOf<"guestbook">;
  guestbook?: { slug: string; entries: GuestbookPublicEntry[] };
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [empresa, setEmpresa] = useState(""); // isca contra bot — humano nunca vê
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = guestbook?.entries ?? [];
  const slug = guestbook?.slug;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!slug || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, name, message, empresa }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Não deu para enviar. Tente de novo.");
        return;
      }

      setSent(true);
      setName("");
      setMessage("");
    } catch {
      setError("A conexão falhou. Confira sua internet e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="block-guestbook">
      <h2 className="block-guestbook__title">{props.title}</h2>

      {entries.length > 0 ? (
        <ul className="block-guestbook__list">
          {entries.map((entry) => (
            <li key={entry.id} className="block-guestbook__entry">
              <p className="block-guestbook__message">{entry.message}</p>
              <p className="block-guestbook__meta">
                {entry.name} · {formatDate(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        // Tela vazia é convite, não recado triste (SPEC 11).
        <p className="block-guestbook__empty">
          Ainda não tem nenhum recado. Seja a primeira pessoa a deixar um.
        </p>
      )}

      {!slug ? (
        <p className="block-guestbook__preview-hint">
          O formulário fica ativo assim que a página é publicada.
        </p>
      ) : sent ? (
        <p className="block-guestbook__sent">
          {props.moderated
            ? "Recado enviado! Aparece assim que for aprovado."
            : "Recado enviado — já está no mural."}
        </p>
      ) : (
        <form onSubmit={submit} className="fieldset block-guestbook__form">
          <div className="field">
            <label htmlFor="guestbook-name" className="field__label">
              Seu nome
            </label>
            <input
              id="guestbook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              className="input"
            />
          </div>

          <div className="field">
            <label htmlFor="guestbook-message" className="field__label">
              Recado
            </label>
            <textarea
              id="guestbook-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              required
              className="input input--area"
            />
          </div>

          {/* Isca contra bot: escondida por CSS, nunca por `type="hidden"` —
              um bot que só lê o DOM ainda encontra e preenche um hidden. */}
          <input
            type="text"
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="block-guestbook__honeypot"
          />

          {error ? (
            <p role="alert" className="field__error">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary justify-center"
          >
            {submitting ? "Enviando…" : "Enviar recado"}
          </button>
        </form>
      )}
    </section>
  );
}
