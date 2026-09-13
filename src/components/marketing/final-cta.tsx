import { CountdownLine } from "@/components/marketing/countdown-line";
import { StartButton } from "@/components/marketing/start-button";
import { copy } from "@/lib/copy";

/**
 * CTA final com glow e contagem regressiva — SPEC 8.1 seção 11.
 * A mesma data real da barra de promoção, não um segundo prazo inventado.
 *
 * Server Component: só a contagem desceu para o cliente, e o botão é o mesmo
 * `form` do hero — daqui a pessoa cai direto no editor.
 */
export function FinalCta({
  deadline,
  label,
  dateLabel,
  now,
}: {
  deadline: string;
  label: string;
  dateLabel: string;
  now: number;
}) {
  return (
    <section className="final-cta">
      <div className="final-cta__glow" aria-hidden />

      <p className="eyebrow">{copy.finalCta.eyebrow}</p>
      <h2 className="final-cta__title">{copy.finalCta.title}</h2>
      <p className="final-cta__lede">{copy.finalCta.lede}</p>

      <CountdownLine
        deadline={deadline}
        label={label}
        dateLabel={dateLabel}
        now={now}
      />

      <StartButton
        label={copy.finalCta.cta}
        className="btn-primary btn-primary--lg"
      />
    </section>
  );
}
