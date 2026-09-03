import Link from "next/link";

import {
  moderateEntryAction,
  toggleCouponAction,
  toggleTemplateAction,
} from "@/app/admin/actions";
import { signOut } from "@/auth";
import { Logo } from "@/components/chrome/logo";
import { CouponForm } from "@/components/admin/coupon-form";
import { GrantForm } from "@/components/admin/grant-form";
import { PlanForm } from "@/components/admin/plan-form";
import { TemplateForm } from "@/components/admin/template-form";
import { getAdminStats, listRecentSites } from "@/lib/admin";
import { listCoupons } from "@/lib/coupons";
import { listPendingEntries } from "@/lib/guestbook";
import { listAllPlans } from "@/lib/plans-db";
import { listAllTemplates } from "@/lib/templates-db";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * `/admin` — SPEC 8.9, recorte da Fase 5: números do negócio e conceder
 * página de graça. Reaproveita as classes `.panel*` do painel do cliente
 * (SPEC 8.7 e CLAUDE.md regra 11: sem motion ambiental aqui também).
 */
export default async function AdminPage() {
  const [stats, sites, coupons, templates, plans, pendingEntries] =
    await Promise.all([
      getAdminStats(),
      listRecentSites(),
      listCoupons(),
      listAllTemplates(),
      listAllPlans(),
      listPendingEntries(),
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
        <h2 className="field__label">Planos</h2>
        <p className="field__hint mb-3">
          Preço, vitrine e recursos — mudam na landing e no checkout na hora,
          sem deploy. Sem criar plano novo: os dois ids estão presos na grade
          do checkout.
        </p>
        <div className="admin__plans">
          {plans.map((plan) => (
            <PlanForm key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="admin__section">
        <h2 className="field__label">Publicar de graça</h2>
        <p className="field__hint mb-3">
          Publica sem cobrar — o pedido fica registrado como concedido pelo
          admin (nunca como se o Mercado Pago tivesse cobrado).
        </p>
        <GrantForm />
      </section>

      <section className="admin__section">
        <h2 className="field__label">Cupons</h2>
        <p className="field__hint mb-3">
          Some as vagas: percentual e valor fixo aplicam antes do bump.
        </p>
        <CouponForm />

        {coupons.length > 0 ? (
          <ul className="panel__list mt-4">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="panel__item">
                <div className="panel__item-main">
                  <p className="panel__item-title">{coupon.code}</p>
                  <p className="panel__item-meta">
                    <span>
                      {coupon.type === "percent"
                        ? `${coupon.value}%`
                        : formatBRL(coupon.value)}
                    </span>
                    <span aria-hidden>·</span>
                    <span data-numeric>
                      {coupon.uses}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ""} usos
                    </span>
                    {coupon.validUntil ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>até {formatDate(coupon.validUntil)}</span>
                      </>
                    ) : null}
                    {!coupon.active ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>desativado</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <form action={toggleCouponAction}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={coupon.active ? "false" : "true"}
                  />
                  <button type="submit" className="btn-quiet">
                    {coupon.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="admin__section">
        <h2 className="field__label">Templates do editor</h2>
        <p className="field__hint mb-3">
          Entram no seletor de formato do editor assim que criados — sem
          deploy. Desativar não apaga: páginas antigas continuam com o
          formato que escolheram.
        </p>
        <TemplateForm />

        {templates.length > 0 ? (
          <ul className="panel__list mt-4">
            {templates.map((template) => (
              <li key={template.id} className="panel__item">
                <div className="panel__item-main">
                  <p className="panel__item-title">{template.name}</p>
                  <p className="panel__item-meta">
                    <span>{template.id}</span>
                    <span aria-hidden>·</span>
                    <span>{template.preset.blocks.join(" → ")}</span>
                    {!template.active ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>desativado</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <form action={toggleTemplateAction}>
                  <input type="hidden" name="id" value={template.id} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={template.active ? "false" : "true"}
                  />
                  <button type="submit" className="btn-quiet">
                    {template.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="admin__section">
        <h2 className="field__label">Mural — fila de moderação</h2>
        <p className="field__hint mb-3">
          Só chega aqui quem escreveu numa página com moderação ligada.
          Aprovar publica; rejeitar apaga — não existe um &quot;rejeitado&quot;
          para guardar.
        </p>

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
