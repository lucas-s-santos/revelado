import { CountdownLine } from "@/components/marketing/countdown-line";
import { StartButton } from "@/components/marketing/start-button";
import { copy } from "@/lib/copy";

/**
 * CTA final — SPEC 8.1 seção 11.
 *
 * Virou um cartão rosa cheio, e não mais uma seção solta sobre o creme: é o
 * último bloco antes do rodapé e precisa fechar a página, não dissolver nela.
 * O botão é o mesmo `form` do hero — daqui a pessoa cai direto no editor.
 *
 * A contagem usa a mesma data real da barra de promoção, nunca um segundo
 * prazo inventado só para meter pressa.
 *
 * Server Component: só a contagem desceu para o cliente.
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
    <section className="section">
      <div className="final-cta">
        <div className="final-cta__glow" aria-hidden />

        <div className="final-cta__inner">
          <p className="eyebrow eyebrow--on-brand">{copy.finalCta.eyebrow}</p>

          <h2 className="final-cta__title">
            {copy.finalCta.titleLead}{" "}
            <span className="display-italic">{copy.finalCta.titleAccent}</span>
          </h2>

          <p className="final-cta__lede">{copy.finalCta.lede}</p>

          <CountdownLine
            deadline={deadline}
            label={label}
            dateLabel={dateLabel}
            now={now}
          />

          <StartButton
            label={copy.finalCta.cta}
            className="btn-on-brand btn-primary--lg"
          />

          <p className="final-cta__note">{copy.finalCta.note}</p>
        </div>
      </div>
    </section>
  );
}
