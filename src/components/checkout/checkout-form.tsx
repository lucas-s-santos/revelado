"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PixPanel } from "@/components/checkout/pix-panel";
import { Logo } from "@/components/chrome/logo";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { track } from "@/lib/analytics";
import type { PublishIssue } from "@/lib/blocks/schema";
import {
  FOREVER_BUMP_CENTS,
  orderTotalCents,
  PLANS,
  type PlanId,
} from "@/lib/plans";
import { cn, formatBRL } from "@/lib/utils";

/**
 * Checkout — SPEC 8.5.
 *
 * "Resumo da página + três planos + order bump + campo de cupom + e-mail
 * (obrigatório — é onde a conta nasce) + Pix ou cartão."
 *
 * O total é recalculado aqui só para a tela; o valor que vale é o que o
 * servidor recalcula em `/api/checkout` (o cliente não decide preço).
 */

interface CheckoutFormProps {
  draftId: string;
  slug: string;
  occasionId: string;
  title: string;
  subtitle: string | null;
  photoCount: number;
  issues: PublishIssue[];
}

interface PixState {
  orderId: string;
  code: string;
  expiresAt: string;
  simulated: boolean;
  amountCents: number;
}

export function CheckoutForm({
  draftId,
  slug,
  occasionId,
  title,
  subtitle,
  photoCount,
  issues,
}: CheckoutFormProps) {
  const router = useRouter();

  const [planId, setPlanId] = useState<PlanId>("especial");
  const [bump, setBump] = useState(false);
  const [email, setEmail] = useState("");
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixState | null>(null);

  const plan = PLANS.find((candidate) => candidate.id === planId);
  const isForever = plan?.durationDays === null;
  const bumpApplies = bump && !isForever;
  const totalCents = orderTotalCents({ planId, bumpForever: bumpApplies });

  const blocked = issues.length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || blocked) return;

    setSubmitting(true);
    setError(null);
    void track("payment_started", { plan: planId, bump: bumpApplies });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          planId,
          bumpForever: bumpApplies,
          email,
          ...(coupon.trim() ? { coupon: coupon.trim() } : {}),
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        orderId?: string;
        amountCents?: number;
        pix?: { code: string; expiresAt: string; simulated: boolean };
      };

      if (!response.ok || !body.orderId || !body.pix) {
        setError(body.error ?? "Não deu para gerar a cobrança. Tente de novo.");
        return;
      }

      setPix({
        orderId: body.orderId,
        code: body.pix.code,
        expiresAt: body.pix.expiresAt,
        simulated: body.pix.simulated,
        amountCents: body.amountCents ?? totalCents,
      });
    } catch {
      setError("A conexão falhou. Confira sua internet e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pix) {
    return (
      <PixPanel
        orderId={pix.orderId}
        code={pix.code}
        expiresAt={pix.expiresAt}
        simulated={pix.simulated}
        amountCents={pix.amountCents}
        onConfirmed={() => router.push(`/sucesso/${pix.orderId}`)}
      />
    );
  }

  return (
    <main className="checkout" data-occasion={occasionId}>
      <header className="checkout__bar">
        <Logo size={26} />
        <Link href={`/editor/${draftId}`} className="btn-quiet">
          ← Voltar a editar
        </Link>
      </header>

      <div className="checkout__grid">
        <section className="checkout__summary">
          <p className="eyebrow">sua página</p>
          <h1 className="checkout__title">{title}</h1>
          {subtitle ? <p className="checkout__sub">{subtitle}</p> : null}

          <dl className="checkout__facts">
            <div>
              <dt>endereço</dt>
              <dd className="break-all">/p/{slug}</dd>
            </div>
            <div>
              <dt>fotos</dt>
              <dd data-numeric>{photoCount}</dd>
            </div>
          </dl>

          {blocked ? (
            <div role="alert" className="checkout__blocked">
              <p className="font-medium">Falta pouco para publicar:</p>
              <ul>
                {issues.map((issue) => (
                  <li key={issue.blockId}>{issue.message}</li>
                ))}
              </ul>
              <Link href={`/editor/${draftId}`} className="btn-primary mt-3">
                Ajustar minha página
              </Link>
            </div>
          ) : null}
        </section>

        <form className="checkout__form" onSubmit={submit}>
          <fieldset className="fieldset" disabled={blocked}>
            <legend className="field__label">Escolha o plano</legend>

            <div className="checkout__plans">
              {PLANS.map((candidate) => (
                <label
                  key={candidate.id}
                  className={cn(
                    "checkout__plan",
                    planId === candidate.id && "is-active",
                  )}
                >
                  <input
                    type="radio"
                    name="plano"
                    value={candidate.id}
                    checked={planId === candidate.id}
                    onChange={() => setPlanId(candidate.id)}
                    className="sr-only"
                  />

                  <span className="checkout__plan-name">
                    {candidate.name}
                    {candidate.highlight ? (
                      <span className="pricing__badge">mais escolhido</span>
                    ) : null}
                  </span>

                  <span data-numeric className="checkout__plan-price">
                    {formatBRL(candidate.priceCents)}
                  </span>

                  <span className="checkout__plan-hint">
                    até {candidate.maxPhotos} fotos ·{" "}
                    {candidate.durationDays === null
                      ? "para sempre"
                      : "1 ano no ar"}
                  </span>

                  {planId === candidate.id ? (
                    <BorderBeam size={50} duration={8} />
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>

          {!isForever ? (
            <label className="pricing__bump">
              <input
                type="checkbox"
                checked={bump}
                disabled={blocked}
                onChange={(event) => setBump(event.target.checked)}
              />
              <span>
                <span className="block">Deixar no ar para sempre</span>
                <span className="block text-xs text-[rgb(var(--color-muted))]">
                  sem renovação, sem prazo
                </span>
              </span>
              <span data-numeric className="ml-auto whitespace-nowrap">
                + {formatBRL(FOREVER_BUMP_CENTS)}
              </span>
            </label>
          ) : null}

          <div className="field">
            <label htmlFor="email" className="field__label">
              Seu e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={blocked}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              className="input"
            />
            <p className="field__hint">
              É para onde vai o link e o QR Code — e é por ele que você edita a
              página depois.
            </p>
          </div>

          <div className="field">
            <label htmlFor="cupom" className="field__label">
              Cupom (opcional)
            </label>
            <input
              id="cupom"
              type="text"
              disabled={blocked}
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="PRIMEIRA"
              className="input"
            />
          </div>

          <div className="checkout__total">
            <span className="eyebrow">total</span>
            <p className="pricing__total-value">
              R${" "}
              <NumberTicker
                key={`${planId}-${bumpApplies}`}
                value={totalCents / 100}
                decimalPlaces={2}
                className="text-[rgb(var(--color-paper))]"
              />
            </p>
          </div>

          {error ? (
            <p role="alert" className="field__error">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || blocked}
            className="btn-primary btn-primary--lg w-full justify-center"
          >
            {submitting ? "Gerando o Pix…" : "Pagar com Pix"}
          </button>

          <p className="text-center text-xs text-[rgb(var(--color-muted))]">
            Pagamento único. 7 dias de garantia.
          </p>
        </form>
      </div>
    </main>
  );
}
