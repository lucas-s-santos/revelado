import { expect, test } from "@playwright/test";

/** Fase 0 — smoke: a página abre e os tokens da seção 4 estão aplicados.
 * O e2e do funil entra na Fase 5 (SPEC 8.5). */
test("a página inicial renderiza com os tokens da Câmara Escura", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

  const body = page.locator("body");
  // --color-noir: 10 7 17
  await expect(body).toHaveCSS("background-color", "rgb(10, 7, 17)");
  // --color-paper: 246 239 230 — texto nunca #FFF
  await expect(body).toHaveCSS("color", "rgb(246, 239, 230)");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
