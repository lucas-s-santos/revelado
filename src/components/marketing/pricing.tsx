"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { startDraft } from "@/app/actions/start-draft";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { track } from "@/lib/analytics";
import { copy } from "@/lib/copy";
import {
  bestInstallment,
  durationLabel,
  FOREVER_BUMP_CENTS,
  orderTotalCents,
  type PlanId,
  type PlanSeed,
} from "@/lib/plans";
import { cn, formatBRL } from "@/lib/utils";

/**
 * Preços — SPEC 8.1 seção 8: três planos, o do meio destacado, order bump
 * clicável e total recalculando com Number Ticker.
 *
 * Todo cálculo passa por `orderTotalCents` (SPEC 12: centavos inteiros, nunca
 * float) — a mesma função que o checkout usa, para a vitrine e a cobrança
 * nunca divergirem. `plans` vem de `page.tsx` (lê `listActivePlans` no
 * servidor — SPEC 8.9, preço editável pelo admin sem deploy).
 */
export function Pricing({ plans }: { plans: PlanSeed[] }) {
  const [selected, setSelected] = useState<PlanId>("especial");
  const [bump, setBump] = useState(false);

  const plan = plans.find((candidate) => candidate.id === selected);
  const isForever = plan?.durationDays === null;
  const bumpApplies = bump && !isForever;
  const totalCents = orderTotalCents({
    planId: selected,
    bumpForever: bumpApplies,
    plan,
  });
  const installment = bestInstallment(totalCents);

  return (
    <section id="precos" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.pricing.eyebrow}</p>
        <h2 className="section__title">{copy.pricing.title}</h2>
        <p className="section__lede">{copy.pricing.lede}</p>
      </header>

      <div role="radiogroup" aria-label="Planos" className="pricing__grid">
        {plans.map((candidate) => {
          const active = candidate.id === selected;

          return (
            <div
              key={candidate.id}
              className={cn(
                "pricing__card",
                candidate.highlight && "is-highlight",
              )}
              data-active={active ? "" : undefined}
            >
              {candidate.highlight ? <ShineBorder borderWidth={1} /> : null}
              {active ? <BorderBeam size={60} duration={8} /> : null}

              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(candidate.id)}
                className="pricing__pick"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-lg">{candidate.name}</span>
                  {candidate.highlight ? (
                    <span className="pricing__badge">
                      {copy.pricing.highlight}
                    </span>
                  ) : null}
                </span>

                <span className="pricing__price">
                  <s data-numeric className="pricing__list">
                    {formatBRL(candidate.listCents)}
                  </s>
                  <strong data-numeric>
                    {formatBRL(candidate.priceCents)}
                  </strong>
                  {/* O prazo sai da duração do plano, não de uma string
                      fixa: foi assim que a vitrine já anunciou "1 ano" para
                      um plano de 24 horas. */}
                  <small>{durationLabel(candidate)}</small>

                  {/* A parcela é calculada pela mesma função do checkout: a
                      vitrine não pode prometer um número que a cobrança recusa. */}
                  <small data-numeric className="pricing__installment">
                    {installmentLabel(candidate.priceCents)}
                  </small>
                </span>
              </button>

              <ul className="pricing__features">
                {candidate.features.map((feature) => (
                  <li key={feature}>
                    <Check
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="mt-1 shrink-0 text-[rgb(var(--color-accent))]"
                    />
                    {feature}
                  </li>
                ))}

                {/* O que o plano NÃO tem, riscado. Sem isto os dois cards
                    parecem quase iguais e a diferença de preço fica sem
                    explicação — o barato precisa dizer o que ele não faz. */}
                {candidate.missing?.map((item) => (
                  <li key={item} className="pricing__missing">
                    <X
                      size={15}
                      strokeWidth={2}
                      aria-hidden
                      className="mt-1 shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Order bump — SPEC 8.5. Some quando o plano já é vitalício. */}
      {!isForever ? (
        <label className="pricing__bump">
          <input
            type="checkbox"
            checked={bump}
            onChange={(event) => setBump(event.target.checked)}
          />
          <span>
            <span className="block">{copy.pricing.bumpLabel}</span>
            <span className="block text-xs text-[rgb(var(--color-ink-muted))]">
              {copy.pricing.bumpHint}
            </span>
          </span>
          <span data-numeric className="ml-auto whitespace-nowrap">
            + {formatBRL(FOREVER_BUMP_CENTS)}
          </span>
        </label>
      ) : null}

      <div className="pricing__total">
        <span className="eyebrow">{copy.pricing.totalLabel}</span>

        <p className="pricing__total-value">
          R${" "}
          <NumberTicker
            key={`${selected}-${bumpApplies}`}
            value={totalCents / 100}
            decimalPlaces={2}
            className="text-[rgb(var(--color-ink))]"
          />
        </p>

        {installment.count > 1 ? (
          <p
            data-numeric
            className="text-sm text-[rgb(var(--color-ink-muted))]"
          >
            no Pix · ou {installment.count}x de{" "}
            {formatBRL(installment.cents)} sem juros
          </p>
        ) : null}

        {/*
          O plano escolhido aqui não viaja para o editor de propósito: quem
          decide plano é o checkout, que recalcula tudo no servidor (o cliente
          não decide preço). A URL antiga levava `?plano=`, mas ninguém do outro
          lado lia — era promessa que não se cumpria. O que viaja é o evento,
          que é o que responde "qual card puxou o clique".
        */}
        <form
          action={startDraft}
          onSubmit={() =>
            void track("checkout_opened", {
              plan: selected,
              bump: bumpApplies,
              from: "landing_pricing",
            })
          }
        >
          <button type="submit" className="btn-primary">
            {copy.pricing.cta}
          </button>
        </form>

        <p className="text-xs text-[rgb(var(--color-ink-muted))]">
          {copy.pricing.guarantee}
        </p>
      </div>
    </section>
  );
}

/** "ou 11x de R$ 3,17" — vazio quando o valor não parcela. */
function installmentLabel(priceCents: number): string {
  const { count, cents } = bestInstallment(priceCents);
  return count > 1 ? `ou ${count}x de ${formatBRL(cents)}` : "à vista";
}
