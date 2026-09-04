import Link from "next/link";

import { getAdminStats, getRevenueStats, listRecentSites } from "@/lib/admin";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * `/admin` — visão geral: os números do negócio (SPEC 8.9). O resto do
 * antigo `/admin` monolítico virou aba própria — ver `admin/layout.tsx`.
 */
export default async function AdminOverviewPage() {
  const [stats, revenue, recentSites] = await Promise.all([
    getAdminStats(),
    getRevenueStats(),
    listRecentSites(6),
  ]);

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Visão geral</h1>

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

      <section className="admin-card">
        <h2 className="admin-card__title">Receita</h2>
        <p className="admin-card__hint">
          Só pedidos com pagamento confirmado — nunca o valor pendente.
        </p>

        <div className="admin__stats">
          <div className="admin__stat">
            <p data-numeric className="admin__stat-value">
              {formatBRL(revenue.totalCents)}
            </p>
            <p className="admin__stat-label">total, desde sempre</p>
          </div>
          <div className="admin__stat">
            <p data-numeric className="admin__stat-value">
              {formatBRL(revenue.last30dCents)}
            </p>
            <p className="admin__stat-label">últimos 30 dias</p>
          </div>
        </div>

        {revenue.byPlan.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Plano</th>
                <th scope="col">Pedidos</th>
                <th scope="col">Receita</th>
              </tr>
            </thead>
            <tbody>
              {revenue.byPlan.map((row) => (
                <tr key={row.planId}>
                  <td>{row.planName}</td>
                  <td data-numeric>{row.orders}</td>
                  <td data-numeric>{formatBRL(row.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2 className="admin-card__title">Últimas páginas</h2>
          <Link href="/admin/paginas" className="btn-quiet">
            Ver todas
          </Link>
        </div>

        {recentSites.length === 0 ? (
          <p className="field__hint">Nenhuma página criada ainda.</p>
        ) : (
          <ul className="panel__list">
            {recentSites.map((site) => (
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
    </div>
  );
}
