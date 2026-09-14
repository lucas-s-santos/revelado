import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Acessibilidade — SPEC 11, e o aceite da Fase 2 ("≥ 95 em acessibilidade").
 *
 * O aceite estava no documento desde a Fase 2 e nunca tinha sido medido. Este
 * arquivo transforma a exigência em portão: violação de WCAG A/AA reprova o
 * build, igual ao orçamento de bundle.
 *
 * O que o axe pega sozinho é contraste, rótulo, ordem de cabeçalho, nome
 * acessível e papel ARIA — que é a maior parte do que a SPEC 11 lista. O que ele
 * **não** pega e continua sendo trabalho humano: percorrer o funil inteiro só
 * com o teclado, e conferir se o texto alternativo diz alguma coisa.
 */

/** WCAG 2.1 níveis A e AA — o patamar que a SPEC 11 descreve. */
const PADRAO = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

interface Violacao {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
  exemplo: string;
}

async function auditar(page: Page): Promise<Violacao[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(PADRAO)
    .analyze();

  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    exemplo: v.nodes[0]?.html?.slice(0, 120) ?? "",
  }));
}

/** Relatório legível no terminal: id, impacto e o primeiro elemento culpado. */
function relatar(tela: string, violacoes: Violacao[]): string {
  if (violacoes.length === 0) return `${tela}: limpo`;

  return [
    `${tela}: ${violacoes.length} violação(ões)`,
    ...violacoes.map(
      (v) =>
        `  · [${v.impact}] ${v.id} — ${v.help} (${v.nodes}x)\n    ${v.exemplo}`,
    ),
  ].join("\n");
}

async function rascunhoPublicavel(page: Page): Promise<{ id: string }> {
  const criado = await page.request.post("/api/drafts", {
    data: { template: "essencial" },
  });
  const { id } = (await criado.json()) as { id: string };

  const atual = await page.request.get(`/api/drafts/${id}`);
  const { content } = (await atual.json()) as {
    content: { blocks: { type: string; props: { mediaIds?: string[] } }[] };
  };
  for (const bloco of content.blocks) {
    if (bloco.type === "gallery") bloco.props.mediaIds = ["foto-de-teste"];
  }
  await page.request.patch(`/api/drafts/${id}`, { data: { content } });

  return { id };
}

test.describe("acessibilidade do funil", () => {
  test("landing", async ({ page }) => {
    await page.goto("/");
    const violacoes = await auditar(page);
    expect(relatar("landing", violacoes)).toBe("landing: limpo");
  });

  test("escolha da ocasião", async ({ page }) => {
    await page.goto("/criar");
    const violacoes = await auditar(page);
    expect(relatar("/criar", violacoes)).toBe("/criar: limpo");
  });

  test("editor", async ({ page }) => {
    const { id } = await rascunhoPublicavel(page);
    await page.goto(`/editor/${id}`);
    await expect(page.getByLabel("Título da capa")).toBeVisible();

    const violacoes = await auditar(page);
    expect(relatar("editor", violacoes)).toBe("editor: limpo");
  });

  test("checkout", async ({ page }) => {
    const { id } = await rascunhoPublicavel(page);
    await page.goto(`/checkout/${id}`);
    await expect(page.getByLabel("Seu e-mail")).toBeVisible();

    const violacoes = await auditar(page);
    expect(relatar("checkout", violacoes)).toBe("checkout: limpo");
  });

  test("página publicada — a tela que é o produto entregue", async ({
    page,
  }) => {
    await page.goto("/p/exemplo-marina-e-teo");
    await expect(page.locator("main.published")).toBeVisible();

    const violacoes = await auditar(page);
    expect(relatar("página publicada", violacoes)).toBe(
      "página publicada: limpo",
    );
  });

  test("portão da senha", async ({ page }) => {
    await page.goto("/entrar");
    const violacoes = await auditar(page);
    expect(relatar("/entrar", violacoes)).toBe("/entrar: limpo");
  });
});
