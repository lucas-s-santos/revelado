import Link from "next/link";

import { signOut } from "@/auth";
import { Logo } from "@/components/chrome/logo";
import { GrantForm } from "@/components/admin/grant-form";
import { getAdminStats, listRecentSites } from "@/lib/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * `/admin` — SPEC 8.9, recorte da Fase 5: números do negócio e conceder
 * página de graça. Reaproveita as classes `.panel*` do painel do cliente
 * (SPEC 8.7 e CLAUDE.md regra 11: sem motion ambiental aqui também).
 */
export default async function AdminPage() {
  const [stats, sites] = await Promise.all([
    getAdminStats(),
    listRecentSites(),
  ]);

  return (
    <main className="panel">
      <header className="panel__bar">
        <Logo />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn-quiet">
            Sair
          </button>
        </form>
      </header>

      <h1 className="panel__title">Admin</h1>

      <div className="admin__stats">
        <div className="admin__stat">
          <p data-numeric className="admin__stat-value">
            {stats.totalUsers}
          </p>
          <p className="admin__stat-label">pessoas cadastradas</p>
        </div>
        <div className="admin__stat">
          <p data-numeric className="admin__stat-value">
            {stats.totalSites}
          </p>
          <p className="admin__stat-label">páginas criadas</p>
        </div>
        <div className="admin__stat">
          <p data-numeric className="admin__stat-value">
            {stats.publishedSites}
          </p>
          <p className="admin__stat-label">páginas no ar</p>
        </div>
        <div className="admin__stat">
          <p data-numeric className="admin__stat-value">
            {stats.paidOrders}
          </p>
          <p className="admin__stat-label">pedidos pagos</p>
        </div>
      </div>

      <section className="admin__section">
        <h2 className="field__label">Publicar de graça</h2>
        <p className="field__hint mb-3">
          Publica sem cobrar — o pedido fica registrado como concedido pelo
          admin (nunca como se o Mercado Pago tivesse cobrado).
        </p>
        <GrantForm />
      </section>

      <section className="admin__section">
        <h2 className="field__label mb-3">Últimas páginas</h2>

        {sites.length === 0 ? (
          <p className="field__hint">Nenhuma página criada ainda.</p>
        ) : (
          <ul className="panel__list">
            {sites.map((site) => (
              <li key={site.id} className="panel__item">
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

                {site.status === "PUBLISHED" ? (
                  <Link href={`/p/${site.slug}`} className="btn-quiet">
                    Ver
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
