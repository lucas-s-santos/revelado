import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/chrome/logo";
import { readAnonId } from "@/lib/anon";
import { listDraftsByAnon } from "@/lib/drafts";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Meu painel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * `/painel` — SPEC 8.7, versão básica que a Fase 5 pede.
 *
 * "Interface **sóbria** — sem aurora, sem beam, sem partícula" (SPEC 8.7 e 6.1
 * regra 2). Quem usa todo dia odeia interface que se mexe.
 *
 * Login por magic link é da Fase 5 no SPEC mas depende do Auth.js e do Resend
 * configurados; enquanto isso, o painel lista pelo mesmo cookie anônimo que
 * segura os rascunhos. Está anotado no README.
 */
export default async function PanelPage() {
  const anonId = await readAnonId();
  const drafts = anonId ? await listDraftsByAnon(anonId) : [];

  return (
    <main className="panel">
      <header className="panel__bar">
        <Logo />
        <Link href="/criar" className="btn-primary">
          Nova página
        </Link>
      </header>

      <h1 className="panel__title">Minhas páginas</h1>

      {drafts.length === 0 ? (
        // Tela vazia é convite, não recado triste (SPEC 11).
        <div className="panel__empty">
          <p>Nenhuma página por aqui ainda.</p>
          <p className="text-sm text-[rgb(var(--color-muted))]">
            Comece pela foto que você já tem no celular — leva uns oito minutos.
          </p>
          <Link href="/criar" className="btn-primary mt-2">
            Criar minha primeira página
          </Link>
        </div>
      ) : (
        <ul className="panel__list">
          {drafts.map((draft) => {
            const hero = draft.content.blocks.find(
              (block) => block.type === "hero",
            );
            const title =
              hero?.type === "hero" && hero.props.title.trim()
                ? hero.props.title
                : "Sem título ainda";

            const published = draft.status === "PUBLISHED";

            return (
              <li key={draft.id} className="panel__item">
                <div className="panel__item-main">
                  <p className="panel__item-title">{title}</p>
                  <p className="panel__item-meta">
                    <span data-status={draft.status}>
                      {published ? "no ar" : "rascunho"}
                    </span>
                    <span aria-hidden>·</span>
                    <span>editada em {formatDate(draft.updatedAt)}</span>
                  </p>
                </div>

                <div className="panel__item-actions">
                  {published ? (
                    <>
                      <Link href={`/p/${draft.slug}`} className="btn-quiet">
                        Ver
                      </Link>
                      <a
                        href={`/api/qr/${draft.slug}?formato=pdf`}
                        className="btn-quiet"
                      >
                        Baixar QR
                      </a>
                    </>
                  ) : (
                    <Link href={`/checkout/${draft.id}`} className="btn-quiet">
                      Publicar
                    </Link>
                  )}

                  <Link href={`/editor/${draft.id}`} className="btn-quiet">
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
