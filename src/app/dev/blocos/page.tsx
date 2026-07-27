import type { Metadata } from "next";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { registry } from "@/components/blocks/registry";
import { PhoneFrame } from "@/components/preview/phone-frame";
import { demoContent, DEMO_SLUG } from "@/lib/blocks/fixtures";
import { blockTypes } from "@/lib/blocks/schema";

export const metadata: Metadata = {
  title: "Motor de blocos",
  robots: { index: false, follow: false },
};

/**
 * Aceite da Fase 3 (SPEC 13): "renderizar um SiteContent fixo em preview e em
 * /p/[slug] com o mesmo componente e resultado idêntico".
 *
 * À esquerda o `PhoneFrame` (mode="preview"), à direita o mesmo `BlockRenderer`
 * em mode="published" — o mesmo JSON, o mesmo componente. A prova automatizada
 * está em `block-renderer.test.tsx`, que compara o HTML renderizado dos dois
 * modos; esta página é a prova visual.
 */
export default function BlocksLabPage() {
  // Fixo, para os dois lados renderizarem exatamente o mesmo contador.
  const now = Date.parse("2026-07-26T15:00:00.000Z");

  return (
    <main className="container-page flex flex-col gap-12 py-16">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Fase 3 · motor de blocos</p>
        <h1 className="text-[clamp(1.9rem,5vw,3rem)]">
          O mesmo renderer, <span className="display-italic">dois lugares</span>
        </h1>
        <p className="max-w-[62ch] text-[rgb(var(--color-muted))]">
          Um único <code>SiteContent</code> em JSON, renderizado pelo mesmo{" "}
          <code>BlockRenderer</code> no preview do editor e na página publicada.
          Se os dois lados divergirem, é bug.
        </p>
        <p className="text-sm text-[rgb(var(--color-muted))]">
          A página publicada de verdade:{" "}
          <a href={`/p/${DEMO_SLUG}`} className="underline">
            /p/{DEMO_SLUG}
          </a>
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[auto_1fr]">
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">mode=&quot;preview&quot;</h2>
          <PhoneFrame content={demoContent} now={now} scale={0.9} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">mode=&quot;published&quot;</h2>
          <div className="published published--boxed">
            <BlockRenderer content={demoContent} mode="published" now={now} />
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">registry</h2>
        <table className="dev-table">
          <thead>
            <tr>
              <th>tipo</th>
              <th>rótulo</th>
              <th>plano</th>
              <th>estado</th>
            </tr>
          </thead>
          <tbody>
            {blockTypes.map((type) => {
              const definition = registry[type];
              return (
                <tr key={type}>
                  <td>
                    <code>{type}</code>
                  </td>
                  <td>{definition.label}</td>
                  <td>{definition.plan ?? "todos"}</td>
                  <td
                    className={
                      definition.ready
                        ? "text-[rgb(var(--color-cyan))]"
                        : "text-[rgb(var(--color-muted))]"
                    }
                  >
                    {definition.ready ? "pronto" : "Fase 7"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
