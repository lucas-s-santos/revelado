import { moderateEntryAction } from "@/app/admin/actions";
import { listPendingEntries } from "@/lib/guestbook";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminGuestbookPage() {
  const pendingEntries = await listPendingEntries();

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Mural — fila de moderação</h1>
      <p className="admin-page__lede">
        Só chega aqui quem escreveu numa página com moderação ligada.
        Aprovar publica; rejeitar apaga — não existe um &quot;rejeitado&quot;
        para guardar.
      </p>

      <section className="admin-card">
        {pendingEntries.length === 0 ? (
          <p className="field__hint">Nenhum recado esperando.</p>
        ) : (
          <ul className="panel__list">
            {pendingEntries.map((entry) => (
              <li key={entry.id} className="panel__item">
                <div className="panel__item-main">
                  <p className="panel__item-title">{entry.message}</p>
                  <p className="panel__item-meta">
                    <span>{entry.name}</span>
                    <span aria-hidden>·</span>
                    <span>/{entry.siteSlug}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(entry.createdAt)}</span>
                  </p>
                </div>

                <div className="panel__item-actions">
                  <form action={moderateEntryAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="approve" value="true" />
                    <button type="submit" className="btn-quiet">
                      Aprovar
                    </button>
                  </form>
                  <form action={moderateEntryAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="approve" value="false" />
                    <button type="submit" className="btn-quiet">
                      Rejeitar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
