"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/chrome/logo";
import { subscribeScroll } from "@/hooks/use-scroll-driver";
import { copy } from "@/lib/copy";

/**
 * Nav em vidro que solidifica depois de 40px de scroll — SPEC 8.1 seção 2.
 *
 * Assina o driver singleton e só chama setState quando o estado **muda** de
 * lado: um re-render por travessia, não um por frame (SPEC 6.4).
 */
export function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    let current = false;

    return subscribeScroll(({ y }) => {
      const next = y > 40;
      if (next === current) return;
      current = next;
      setSolid(next);
    });
  }, []);

  return (
    <header className="site-nav" data-solid={solid ? "" : undefined}>
      <div className="site-nav__inner container-page">
        <Logo />

        <nav aria-label="Navegação principal" className="site-nav__links">
          {copy.nav.links.map((link) => (
            <a key={link.href} href={link.href} className="site-nav__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/painel" className="site-nav__login">
            {copy.nav.login}
          </Link>
          <Link href="/criar" className="site-nav__cta">
            {copy.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}
