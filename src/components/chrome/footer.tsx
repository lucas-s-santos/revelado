import Link from "next/link";

import { Logo } from "@/components/chrome/logo";
import { copy } from "@/lib/copy";

/** Rodapé — SPEC 8.1 seção 12. Server Component: só estrutura. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Logo href={null} />
          <p className="max-w-[34ch] text-sm text-[rgb(var(--color-muted))]">
            {copy.footer.tagline}
          </p>
        </div>

        {copy.footer.columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="eyebrow mb-3">{column.title}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[rgb(var(--color-muted))] transition-colors hover:text-[rgb(var(--color-paper))]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="container-page flex flex-col gap-1 border-t border-[rgb(var(--color-paper)/0.08)] py-6 text-xs text-[rgb(var(--color-muted))] sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {copy.brand.name}. {copy.footer.rights}
        </p>
        <p>Feito no Brasil</p>
      </div>
    </footer>
  );
}
