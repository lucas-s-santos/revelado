import { OCCASIONS } from "@/lib/occasions";
import { PLANS } from "@/lib/plans";
import { formatBRL } from "@/lib/utils";

/**
 * Placeholder da Fase 0. Existe só para provar que os tokens da seção 4 do SPEC
 * estão aplicados (cor, tipografia, vidro, grid, accent por ocasião).
 * A landing de verdade é a Fase 2 (SPEC 8.1) e substitui este arquivo inteiro.
 */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0"
      />

      <div className="container-page relative flex min-h-screen flex-col justify-center gap-14 py-24">
        <header className="flex flex-col gap-5">
          <p className="eyebrow">Fase 0 · fundação</p>
          <h1 className="text-[clamp(2.75rem,9vw,5.5rem)]">
            Revelado, <span className="display-italic">em breve</span>
          </h1>
          <p className="max-w-[46ch] text-[rgb(var(--color-muted))]">
            Tokens da Câmara Escura aplicados. Nenhuma tela construída ainda — a
            landing é a Fase 2.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Accent por ocasião</h2>
          <ul className="flex flex-wrap gap-2">
            {OCCASIONS.map((occasion) => (
              <li
                key={occasion.id}
                data-occasion={occasion.id}
                className="glass flex items-center gap-2.5 px-3.5 py-2 text-sm"
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ background: "rgb(var(--color-accent))" }}
                />
                {occasion.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Planos (centavos, inteiros)</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <li key={plan.id} className="glass flex flex-col gap-1 p-5">
                <span className="text-sm text-[rgb(var(--color-muted))]">
                  {plan.name}
                </span>
                <span data-numeric className="text-2xl">
                  {formatBRL(plan.priceCents)}
                </span>
                <span
                  data-numeric
                  className="text-xs text-[rgb(var(--color-muted))] line-through"
                >
                  {formatBRL(plan.listCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
