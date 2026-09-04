import { PlanForm } from "@/components/admin/plan-form";
import { listAllPlans } from "@/lib/plans-db";

export const dynamic = "force-dynamic";

/**
 * `/admin/planos` — SPEC 8.9. Sem criação: os dois ids ("simples", "especial")
 * estão presos na grade de dois cards do checkout — admin edita, não cria um
 * terceiro. Ver a nota completa em `lib/plans.ts`.
 */
export default async function AdminPlansPage() {
  const plans = await listAllPlans();

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Planos</h1>
      <p className="admin-page__lede">
        Preço, vitrine e recursos — mudam na landing e no checkout na hora,
        sem deploy.
      </p>

      <div className="admin__plans">
        {plans.map((plan) => (
          <PlanForm key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
