import Link from "next/link";

import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Rodapé da página publicada — SPEC 7.2.
 *
 * A assinatura do Revelado com o link de criação é o que faz uma página
 * viralizada virar cliente novo. Não é enfeite, é distribuição.
 */
export function FooterBlock({ props }: { props: PropsOf<"footer"> }) {
  return (
    <footer className="block-footer">
      <p className="block-footer__text">{props.text}</p>

      <Link href="/" className="block-footer__brand">
        feito com <strong>Revelado</strong>
      </Link>
    </footer>
  );
}
