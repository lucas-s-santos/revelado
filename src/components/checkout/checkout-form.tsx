"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PixPanel } from "@/components/checkout/pix-panel";
import { Logo } from "@/components/chrome/logo";
import { BorderBeam } from "@/components/ui/border-beam";
import { track } from "@/lib/analytics";
import type { PublishIssue } from "@/lib/blocks/schema";
import {
  bestInstallment,
  durationLabel,
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
  /** paleta do conteúdo — tinge o accent desta tela junto com a página */
  palette: string;
  title: string;
  subtitle: string | null;
  photoCount: number;
  issues: PublishIssue[];
}

type Method = "pix" | "card";

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
  palette,
  title,
  subtitle,
  photoCount,
  issues,
}: CheckoutFormProps) {
  const router = useRouter();

  const [planId, setPlanId] = useState<PlanId>("especial");
  const [method, setMethod] = useState<Method>("pix");
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
  const installment = bestInstallment(totalCents);

  const blocked = issues.length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || blocked) return;

    setSubmitting(true);
    setError(null);
    void track("payment_started", { plan: planId, bump: bumpApplies, method });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          planId,
          bumpForever: bumpApplies,
          email,
          method,
          ...(coupon.trim() ? { coupon: coupon.trim() } : {}),
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        orderId?: string;
        amountCents?: number;
        pix?: { code: string; expiresAt: string; simulated: boolean };
        card?: { url: string; installments: number; simulated: boolean };
      };

      if (!response.ok || !body.orderId) {
        setError(body.error ?? "Não deu para gerar a cobrança. Tente de novo.");
        return;
      }

      if (body.card) {
        // O cartão é preenchido no Checkout Pro: nenhum dado dele passa por
        // aqui. `location.assign` e não `router.push` porque o destino é outro
        // domínio quando o Mercado Pago está configurado.
        window.location.assign(body.card.url);
        return;
      }

      if (!body.pix) {
        setError("Não deu para gerar a cobrança. Tente de novo.");
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
    <main className="checkout" data-palette={palette}>
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

                  {/* O prazo sai de `durationLabel`, nunca de string fixa.
                      Havia um "1 ano no ar" escrito à mão aqui: o plano dura
                      24 horas (`durationDays: 1`), então a tela de pagamento
                      prometia um ano e a cobrança entregava um dia. É a mesma
                      divergência que o helper foi criado para acabar — ela
                      voltou por outro arquivo. */}
                  <span className="checkout__plan-hint">
                    até {candidate.maxPhotos} fotos · {durationLabel(candidate)}
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
                <span className="block text-xs text-[rgb(var(--color-ink-muted))]">
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

          {/* Meio de pagamento. O Pix vem marcado porque cai na hora e a
              página publica em segundos; o cartão existe para quem prefere
              diluir, que no impulso de presente é o que destrava a compra. */}
          <fieldset className="fieldset" disabled={blocked}>
            <legend className="field__label">Como você quer pagar</legend>

            <div className="checkout__methods">
              <label
                className={cn(
                  "checkout__method",
                  method === "pix" && "is-active",
                )}
              >
                <input
                  type="radio"
                  name="meio"
                  value="pix"
                  checked={method === "pix"}
                  onChange={() => setMethod("pix")}
                  className="sr-only"
                />
                <span className="checkout__method-name">Pix</span>
                <span data-numeric className="checkout__method-price">
                  {formatBRL(totalCents)}
                </span>
                <span className="checkout__method-hint">
                  cai na hora · sua página publica em segundos
                </span>
              </label>

              <label
                className={cn(
                  "checkout__method",
                  method === "card" && "is-active",
                )}
              >
                <input
                  type="radio"
                  name="meio"
                  value="card"
                  checked={method === "card"}
                  onChange={() => setMethod("card")}
                  className="sr-only"
                />
                <span className="checkout__method-name">Cartão</span>
                <span data-numeric className="checkout__method-price">
                  {installment.count > 1
                    ? `${installment.count}x ${formatBRL(installment.cents)}`
                    : formatBRL(totalCents)}
                </span>
                <span className="checkout__method-hint">
                  {installment.count > 1
                    ? "sem juros · ou à vista"
                    : "à vista no cartão"}
                </span>
              </label>
            </div>
          </fieldset>

          {/* Dinheiro não anima.
           *
           * Aqui havia um `NumberTicker`. Ele só parte quando entra na
           * viewport, e o total mora no fim de uma tela de 2.900px: quem
           * chegava rolando via **TOTAL R$ 0** e depois o número subindo como
           * caça-níquel por uns três segundos. Medido: R$ 34,39 aos 2,5s,
           * ainda a caminho de 34,90.
           *
           * Este é o número que a pessoa confere antes de pagar. Ele precisa
           * estar certo no primeiro quadro, e igual em qualquer momento da
           * rolagem. `formatBRL` é o que o resto da tela já usa. */}
          <div className="checkout__total">
            <span className="eyebrow">total</span>
            <p data-numeric className="pricing__total-value">
              {formatBRL(totalCents)}
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
            {submitting
              ? method === "pix"
                ? "Gerando o Pix…"
                : "Abrindo o pagamento…"
              : method === "pix"
                ? "Pagar com Pix"
                : "Pagar com cartão"}
          </button>

          <p className="text-center text-xs text-[rgb(var(--color-ink-muted))]">
            Pagamento único. 7 dias de garantia.
          </p>
        </form>
      </div>
    </main>
  );
}
