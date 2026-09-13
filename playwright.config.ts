import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/** e2e do funil (SPEC 2 / 8.5). 90% do tráfego é mobile — o projeto padrão é
 * um celular, desktop é o secundário. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "on-first-retry",
    /**
     * Movimento desligado em todo teste.
     *
     * Não é só higiene de estabilidade: a auditoria de acessibilidade mede cor
     * no estado em que a tela está, e com as animações correndo o resultado
     * mudava entre execuções — a mesma página passava numa rodada e reprovava na
     * seguinte. Um portão que depende de timing não é portão.
     *
     * E o estado sem movimento é justamente o que a regra inviolável 14 promete
     * a quem pede `prefers-reduced-motion`: é o que mais merece ser auditado.
     */
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      // O e2e percorre o funil inteiro várias vezes por minuto de um IP só —
      // o padrão que o limitador existe para barrar. A folga só tem efeito
      // fora de um host (ver lib/rate-limit.ts); num deploy é ignorada.
      RATE_LIMIT_TEST_SLACK: "50",
    },
  },
});
