import { expect, test } from "@playwright/test";

/**
 * Smoke: a página abre e os tokens da identidade estão aplicados.
 *
 * Os valores mudaram na repintura (fundo rosado, tinta arroxeada) e este teste
 * continuava afirmando a paleta escura antiga — ele reprovava desde o merge do
 * pivô, e ninguém viu porque o e2e não estava no CI.
 */
test("a página inicial renderiza com os tokens da identidade", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

  const body = page.locator("body");
  // --color-bg: 255 245 248
  await expect(body).toHaveCSS("background-color", "rgb(255, 245, 248)");
  // --color-ink: 26 18 48
  await expect(body).toHaveCSS("color", "rgb(26, 18, 48)");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
