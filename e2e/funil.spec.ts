import { expect, test, type Page } from "@playwright/test";

/**
 * Funil de ponta a ponta — aceite da Fase 5 (SPEC 13): "e2e cobrindo pago,
 * pendente, expirado e reembolsado".
 *
 * Roda sem conta no Mercado Pago: sem `MERCADOPAGO_ACCESS_TOKEN` a cobrança sai
 * do simulador, e o painel de simulação dispara o **webhook de verdade**, com o
 * mesmo corpo que o provedor mandaria. Isso é de propósito — o que estes testes
 * provam não é que a tela muda de cor, é que **nada publica sem passar pelo
 * webhook** (anti-padrão 6).
 *
 * Os unitários em `lib/payment-flow.test.ts` já cobrem as transições de estado.
 * O que só o navegador prova é o caminho da pessoa: o rascunho nasce no
 * servidor, sobrevive a fechar a aba, o checkout recusa página vazia, e a página
 * publicada abre para quem recebeu o link — e só para quem deveria.
 */

const EMAIL = "e2e@revelado.com.br";

interface Rascunho {
  id: string;
  slug: string;
}

/**
 * Rascunho pronto para pagar.
 *
 * A galeria nasce vazia e é isso que trava a publicação (`validateForPublish`),
 * então o preparo injeta uma foto. Vai pela API em vez de pelo editor de
 * propósito: o caminho do editor tem teste próprio abaixo, e repeti-lo nos
 * quatro desfechos deixaria o e2e lento e frágil sem provar nada novo.
 */
async function rascunhoPublicavel(page: Page): Promise<Rascunho> {
  const criado = await page.request.post("/api/drafts", {
    data: { occasion: "namorados" },
  });
  expect(criado.status(), "criar rascunho").toBe(201);

  const { id, slug } = (await criado.json()) as Rascunho;

  const atual = await page.request.get(`/api/drafts/${id}`);
  const { content } = (await atual.json()) as {
    content: { blocks: { type: string; props: { mediaIds?: string[] } }[] };
  };

  for (const bloco of content.blocks) {
    if (bloco.type === "gallery") bloco.props.mediaIds = ["foto-de-teste"];
  }

  const salvo = await page.request.patch(`/api/drafts/${id}`, {
    data: { content },
  });
  expect(salvo.ok(), "salvar a foto no rascunho").toBeTruthy();

  return { id, slug };
}

/** Vai do checkout até a tela de Pix, onde o simulador aparece. */
async function abrirPix(page: Page, draftId: string): Promise<void> {
  await page.goto(`/checkout/${draftId}`);

  await page.getByLabel("Seu e-mail").fill(EMAIL);
  await page.getByRole("button", { name: "Pagar com Pix" }).click();

  await expect(
    page.getByRole("heading", { name: "Escaneie para pagar" }),
  ).toBeVisible();
}

/**
 * Alertas da própria interface.
 *
 * `getByRole("alert")` sozinho pega junto o anunciador de rota do Next, que é
 * um `role="alert"` invisível com o título da página dentro. Filtrar por texto
 * não resolve — o título costuma conter as mesmas palavras do erro.
 */
const alertas = (page: Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)');

/** Dispara o webhook pelo painel do simulador. */
async function simular(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

test.describe("os quatro desfechos do pagamento", () => {
  test("pago: publica a página e entrega o QR Code", async ({ page }) => {
    const { id, slug } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Pagar");

    // Quem leva para o sucesso é o polling vendo o webhook ter publicado.
    await expect(page).toHaveURL(/\/sucesso\//, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /existe/ })).toBeVisible();

    // O e-mail do comprador aparece — e é por isso que a tela confere o dono.
    await expect(page.getByText(EMAIL)).toBeVisible();

    // A página publicada está no ar para quem receber o link.
    await page.goto(`/p/${slug}`);
    await expect(page.locator("main.published")).toBeVisible();

    // O QR Code existe nos três formatos que a SPEC 9.3 exige.
    for (const formato of ["png", "svg", "pdf"]) {
      const resposta = await page.request.get(
        `/api/qr/${slug}?formato=${formato}`,
      );
      expect(resposta.ok(), `QR em ${formato}`).toBeTruthy();
    }
  });

  test("pendente: não publica nada", async ({ page }) => {
    const { id, slug } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Deixar pendente");

    // A tela continua esperando: pendente não é pago.
    await expect(
      page.getByRole("heading", { name: "Escaneie para pagar" }),
    ).toBeVisible();

    const publicada = await page.request.get(`/p/${slug}`);
    expect(publicada.status(), "página não pode estar no ar").toBe(404);
  });

  test("expirado: nada cobrado e o rascunho continua editável", async ({
    page,
  }) => {
    const { id, slug } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Expirar");

    await expect(
      page.getByRole("heading", { name: "Este Pix expirou" }),
    ).toBeVisible();

    const publicada = await page.request.get(`/p/${slug}`);
    expect(publicada.status()).toBe(404);

    // "Nada foi cobrado e sua página continua salva": o editor tem que abrir.
    await page.goto(`/editor/${id}`);
    await expect(page.getByLabel("Título da capa")).toBeVisible();
  });

  test("reembolsado depois de pago: o pedido registra o reembolso", async ({
    page,
  }) => {
    const { id } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Pagar");
    await expect(page).toHaveURL(/\/sucesso\//, { timeout: 20_000 });

    const orderId = page.url().split("/sucesso/")[1]?.split("?")[0] ?? "";
    expect(orderId, "id do pedido na URL").not.toBe("");

    await page.request.post("/api/webhooks/mercadopago", {
      data: {
        type: "payment",
        action: "payment.refunded",
        data: { id: `sim_${orderId}` },
      },
    });

    const pedido = await page.request.get(`/api/orders/${orderId}`);
    const { status } = (await pedido.json()) as { status: string };
    expect(status).toBe("REFUNDED");
  });
});

test.describe("o caminho de quem monta a página", () => {
  test("ocasião, template e editor — o funil de criação inteiro", async ({
    page,
  }) => {
    await page.goto("/criar");

    await page
      .locator('[data-occasion="namorados"]')
      .getByRole("button")
      .click();

    // SPEC 8.3: a escolha do template, com preview real dentro do mockup.
    await expect(page).toHaveURL(/\/criar\/namorados/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "clima",
    );

    const cards = page.locator(".template-card");
    const quantos = await cards.count();
    expect(quantos, "SPEC 8.3 pede de 6 a 8 templates").toBeGreaterThanOrEqual(
      6,
    );
    expect(quantos).toBeLessThanOrEqual(8);

    // Preview real e não imagem: cada card traz o PhoneFrame montado.
    await expect(page.locator(".phone-frame").first()).toBeVisible();

    await cards.first().click();

    // O rascunho nasce no servidor e a URL já traz o id que ele criou.
    await expect(page).toHaveURL(/\/editor\/[\w-]+/, { timeout: 20_000 });
    await expect(page.getByLabel("Título da capa")).toBeVisible();
  });

  test("o template escolhido chega no rascunho", async ({ page }) => {
    await page.goto("/criar/casamento");

    // "Manuscrito" é serifa sem efeito — dá para conferir no conteúdo salvo.
    await page
      .locator(".template-card")
      .filter({ hasText: "Manuscrito" })
      .click();

    await expect(page).toHaveURL(/\/editor\/[\w-]+/, { timeout: 20_000 });

    const draftId = page.url().split("/editor/")[1] ?? "";
    const resposta = await page.request.get(`/api/drafts/${draftId}`);
    const { content } = (await resposta.json()) as {
      content: { theme: { template: string; font: string; effect: string } };
    };

    expect(content.theme.template).toBe("casamento-manuscrito");
    expect(content.theme.font).toBe("serif");
    expect(content.theme.effect).toBe("none");
  });

  test("fecha a aba, volta e encontra tudo salvo", async ({ page }) => {
    const { id } = await rascunhoPublicavel(page);
    const titulo = "Nosso primeiro apartamento";

    await page.goto(`/editor/${id}`);
    await page.getByLabel("Título da capa").fill(titulo);

    // Autosave tem debounce de 800ms e ainda precisa da ida ao servidor.
    await expect(page.getByText(/salvo/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // "Fechar a aba" de verdade: recarrega do servidor, sem estado em memória.
    await page.reload();
    await expect(page.getByLabel("Título da capa")).toHaveValue(titulo);
  });

  test("o checkout recusa página vazia em vez de cobrar por ela", async ({
    page,
  }) => {
    // Sem a foto: a galeria vazia trava a publicação.
    const criado = await page.request.post("/api/drafts", {
      data: { occasion: "namorados" },
    });
    const { id } = (await criado.json()) as Rascunho;

    await page.goto(`/checkout/${id}`);

    await expect(alertas(page)).toContainText("Adicione ao menos uma foto");
    await expect(
      page.getByRole("button", { name: "Pagar com Pix" }),
    ).toBeDisabled();
  });
});

test.describe("quem pode ver o quê", () => {
  test("a senha esconde a página de quem não tem ela", async ({ page }) => {
    const { id, slug } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Pagar");
    await expect(page).toHaveURL(/\/sucesso\//, { timeout: 20_000 });

    // Põe a senha pelo painel.
    await page.goto(`/painel/${id}`);
    await page.getByLabel("Senha da página").fill("nosso-lugar");
    await page.getByRole("button", { name: "Salvar" }).click();

    // Espera a Server Action terminar de verdade: o painel passa a oferecer
    // trocar a senha em vez de criar uma. Sem esta âncora o teste corre contra
    // o servidor e falha por tempo, não por defeito.
    await expect(page.getByText("Já existe uma senha")).toBeVisible({
      timeout: 15_000,
    });

    // Quem abre o link cai no portão, sem ver o conteúdo.
    await page.context().clearCookies();
    await page.goto(`/p/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/p/${slug}/senha`));
    await expect(page.locator("main.published")).toHaveCount(0);

    // Senha errada não abre e explica o que fazer.
    await page.getByLabel("Senha da página").fill("chute");
    await page.getByRole("button", { name: "Abrir a página" }).click();
    await expect(alertas(page)).toContainText("não abriu");

    // Senha certa abre.
    await page.getByLabel("Senha da página").fill("nosso-lugar");
    await page.getByRole("button", { name: "Abrir a página" }).click();
    await expect(page.locator("main.published")).toBeVisible();
  });

  test("o sucesso de outra pessoa não abre", async ({ page, browser }) => {
    const { id } = await rascunhoPublicavel(page);

    await abrirPix(page, id);
    await simular(page, "Pagar");
    await expect(page).toHaveURL(/\/sucesso\//, { timeout: 20_000 });

    const url = page.url();

    // Outro navegador: sem o cookie de quem montou e sem o token do e-mail.
    const estranho = await browser.newContext();
    const outra = await estranho.newPage();
    const resposta = await outra.goto(url);

    expect(resposta?.status(), "e-mail do comprador não pode vazar").toBe(404);
    await estranho.close();
  });

  test("o editor de outra pessoa não abre", async ({ page, browser }) => {
    const { id } = await rascunhoPublicavel(page);

    const estranho = await browser.newContext();
    const outra = await estranho.newPage();
    const resposta = await outra.goto(`/editor/${id}`);

    expect(resposta?.status()).toBe(404);
    await estranho.close();
  });
});
