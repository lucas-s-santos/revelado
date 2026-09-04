"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/paginas", label: "Páginas" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/mural", label: "Mural" },
] as const;

/**
 * Navegação do admin — único client component da casca (CLAUDE.md regra 4:
 * "use client" só na folha). Só existe porque marcar o link ativo depende de
 * `usePathname`, que não roda em Server Component.
 *
 * Sem motion nenhum (CLAUDE.md regra 11): a marca de ativo é só cor e peso de
 * fonte, nada anima ao trocar de aba.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Seções do admin">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className="admin-nav__link"
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
