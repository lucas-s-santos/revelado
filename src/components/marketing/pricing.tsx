"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { track } from "@/lib/analytics";
import { copy } from "@/lib/copy";
import {
  FOREVER_BUMP_CENTS,
  orderTotalCents,
  PLANS,
  type PlanId,
} from "@/lib/plans";
import { cn, formatBRL } from "@/lib/utils";

/**
 * Preços — SPEC 8.1 seção 8: três planos, o do meio destacado, order bump
 * clicável e total recalculando com Number Ticker.
 *
 * Todo cálculo passa por `orderTotalCents` (SPEC 12: centavos inteiros, nunca
 * float) — a mesma função que o checkout da Fase 5 vai usar, para a vitrine e a
 * cobrança nunca divergirem.
 */
export function Pricing() {
  const [selected, setSelected] = useState<PlanId>("especial");
  const [bump, setBump] = useState(false);

  const plan = PLANS.find((candidate) => candidate.id === selected);
  const isForever = plan?.durationDays === null;
  const bumpApplies = bump && !isForever;
  const totalCents = orderTotalCents({
    planId: selected,
    bumpForever: bumpApplies,
  });

  return (
    <section id="precos" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.pricing.eyebrow}</p>
        <h2 className="section__title">{copy.pricing.title}</h2>
        <p className="section__lede">{copy.pricing.lede}</p>
      </header>

      <div role="radiogroup" aria-label="Planos" className="pricing__grid">
        {PLANS.map((candidate) => {
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
                  <small>
                    {candidate.durationDays === null
                      ? copy.pricing.forever
                      : copy.pricing.perYear}
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
            <span className="block text-xs text-[rgb(var(--color-muted))]">
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
            className="text-[rgb(var(--color-paper))]"
          />
        </p>

        <Link
          href={`/criar?plano=${selected}${bumpApplies ? "&sempre=1" : ""}`}
          onClick={() =>
            void track("checkout_opened", {
              plan: selected,
              bump: bumpApplies,
              from: "landing_pricing",
            })
          }
          className="btn-primary"
        >
          {copy.pricing.cta}
        </Link>

        <p className="text-xs text-[rgb(var(--color-muted))]">
          {copy.pricing.guarantee}
        </p>
      </div>
    </section>
  );
}
