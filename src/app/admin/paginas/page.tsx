import { Search } from "lucide-react";
import Link from "next/link";

import { deleteSiteAction, setIndexableAction } from "@/app/admin/actions";
import { GrantForm } from "@/components/admin/grant-form";
import { SiteActions } from "@/components/admin/site-actions";
import { searchSites } from "@/lib/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * `/admin/paginas` — SPEC 8.9 "busca de pedido" + gestão básica de páginas.
 *
 * "Editar" aqui fica no que dá para arrumar sem abrir o editor de blocos:
 * indexação, link (só antes de publicar — o QR já impresso não pode mudar de
 * endereço), reenvio do e-mail de publicação, exclusão (soft delete). Trocar
 * foto ou texto continua sendo trabalho de quem é dono da página.
 */
export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const sites = await searchSites(q, 50);

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Páginas</h1>

      <section className="admin-card">
        <h2 className="admin-card__title">Publicar de graça</h2>
        <p className="admin-card__hint">
          Publica sem cobrar — o pedido fica registrado como concedido pelo
          admin (nunca como se o Mercado Pago tivesse cobrado).
        </p>
        <GrantForm />
      </section>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2 className="admin-card__title">Todas as páginas</h2>
        </div>

        <form method="GET" className="admin-search">
          <Search size={16} aria-hidden className="admin-search__icon" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="buscar por link ou e-mail…"
            className="input"
          />
          {q ? (
            <Link href="/admin/paginas" className="btn-quiet">
              Limpar
            </Link>
          ) : null}
        </form>

        {sites.length === 0 ? (
          <p className="field__hint">
            {q ? "Nada encontrado para essa busca." : "Nenhuma página criada ainda."}
          </p>
        ) : (
          <ul className="panel__list">
            {sites.map((site) => {
              const published = site.status === "PUBLISHED";

              return (
                <li key={site.id} className="panel__item admin-site">
                  <details className="admin-site__details">
                    <summary className="admin-site__summary">
                      <div className="panel__item-main">
                        <p className="panel__item-title">/{site.slug}</p>
                        <p className="panel__item-meta">
                          <span data-status={site.status}>{site.status}</span>
                          <span aria-hidden>·</span>
                          <span>{site.ownerEmail ?? "sem conta ainda"}</span>
                          <span aria-hidden>·</span>
                          <span>criada em {formatDate(site.createdAt)}</span>
                        </p>
                      </div>

                      {published ? (
                        <Link href={`/p/${site.slug}`} className="btn-quiet">
                          Ver
                        </Link>
                      ) : null}
                    </summary>

                    <div className="admin-site__panel">
                      <SiteActions
                        id={site.id}
                        slug={site.slug}
                        published={published}
                      />

                      <div className="site-actions__row">
                        <form action={setIndexableAction}>
                          <input type="hidden" name="id" value={site.id} />
                          <input
                            type="hidden"
                            name="indexable"
                            value={site.indexable ? "false" : "true"}
                          />
                          <button type="submit" className="btn-quiet">
                            {site.indexable
                              ? "Tirar do Google"
                              : "Deixar indexável no Google"}
                          </button>
                        </form>

                        <form action={deleteSiteAction}>
                          <input type="hidden" name="id" value={site.id} />
                          <button type="submit" className="btn-quiet">
                            Excluir
                          </button>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
