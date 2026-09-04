import { toggleCouponAction } from "@/app/admin/actions";
import { CouponForm } from "@/components/admin/coupon-form";
import { listCoupons } from "@/lib/coupons";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listCoupons();

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Cupons</h1>
      <p className="admin-page__lede">
        Percentual e valor fixo aplicam antes do bump &quot;para sempre&quot;.
      </p>

      <div className="admin-page__grid">
        <CouponForm />

        <section className="admin-card">
          <h2 className="admin-card__title">Todos os cupons</h2>

          {coupons.length === 0 ? (
            <p className="field__hint">Nenhum cupom criado ainda.</p>
          ) : (
            <ul className="panel__list">
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
          )}
        </section>
      </div>
    </div>
  );
}
