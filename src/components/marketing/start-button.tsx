import { startDraft } from "@/app/actions/start-draft";
import { Magnetic } from "@/components/motion/magnetic";
import { copy } from "@/lib/copy";

/**
 * O botão que começa a página. Server Component: o `form` chama a Server Action
 * direto, sem um byte de JavaScript no caminho crítico.
 *
 * Substitui o grid de oito ocasiões — não há mais o que escolher antes de
 * começar, e o passo que sumiu era o de maior evasão do funil (SPEC 14).
 */
export function StartButton({
  label = copy.hero.cta,
  template,
  magnetic = true,
  className = "btn-primary",
}: {
  label?: string;
  /** preset a aplicar; sem isso vai no essencial */
  template?: string;
  /** o ímã é do hero e do CTA final — no meio da página cansa (SPEC 6.1) */
  magnetic?: boolean;
  className?: string;
}) {
  const button = (
    <button type="submit" className={className}>
      {label}
    </button>
  );

  return (
    <form action={startDraft}>
      {template ? <input type="hidden" name="template" value={template} /> : null}
      {magnetic ? <Magnetic>{button}</Magnetic> : button}
    </form>
  );
}
