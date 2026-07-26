import Image from "next/image";
import Link from "next/link";

import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * Lockup da marca: símbolo + nome. **Único lugar** que referencia o arquivo da
 * logo — trocar o asset é trocar uma linha aqui.
 *
 * Nota de identidade: `public/logo.png` veio em petróleo/creme/coral, uma
 * paleta diferente da Câmara Escura (âmbar e magenta sobre noir). O símbolo
 * funciona sobre o noir porque o corpo do envelope é claro, mas ele não puxa o
 * accent da ocasião como o resto da interface. Se aparecer uma versão vetorial
 * ou monocromática, é aqui que ela entra.
 */
export function Logo({
  size = 34,
  href = "/",
  showName = true,
  className,
}: {
  size?: number;
  href?: string | null;
  showName?: boolean;
  className?: string;
}) {
  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo-mark-128.png"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {showName ? (
        <span className="font-[family-name:var(--font-display)] text-[1.35rem] leading-none">
          {copy.brand.name}
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label={`${copy.brand.name} — ${copy.brand.tagline}`}
      className="rounded-sm"
    >
      {content}
    </Link>
  );
}
