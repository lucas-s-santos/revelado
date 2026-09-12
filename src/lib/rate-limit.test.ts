import { beforeEach, describe, expect, it, vi } from "vitest";

// O limitador lê o IP do cabeçalho e a identidade do cookie. Os dois vêm do
// contexto de requisição do Next, que não existe em teste — então entram aqui.
const fakeIp = { value: "200.0.0.1" };
const fakeAnon = { value: null as string | null };

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) => (name === "x-forwarded-for" ? fakeIp.value : null),
    }),
}));

vi.mock("@/lib/anon", () => ({
  readAnonId: () => Promise.resolve(fakeAnon.value),
}));

const { allow, hit, LIMITS, resetLimits, retryAfter } =
  await import("@/lib/rate-limit");

/**
 * Teto de requisições — SPEC 9.4.
 *
 * O que estes testes travam não é a contagem em si: é que a janela **fecha** e
 * que ela **reabre**. Um limitador que nunca reabre é um jeito lento de tirar o
 * próprio site do ar, e um que nunca fecha não é limitador nenhum.
 */
describe("limite de requisições", () => {
  beforeEach(() => {
    resetLimits();
  });

  it("deixa passar até o limite e barra a partir dele", () => {
    for (let i = 0; i < 3; i++) {
      expect(hit("teste", 3, 60_000)).toBe(true);
    }

    expect(hit("teste", 3, 60_000)).toBe(false);
    expect(hit("teste", 3, 60_000)).toBe(false);
  });

  it("conta cada chave separadamente — um visitante não gasta a cota do outro", () => {
    expect(hit("ip-a", 1, 60_000)).toBe(true);
    expect(hit("ip-a", 1, 60_000)).toBe(false);

    // O segundo IP chega com a cota inteira.
    expect(hit("ip-b", 1, 60_000)).toBe(true);
  });

  it("reabre a janela depois que o prazo passa", async () => {
    expect(hit("curto", 1, 30)).toBe(true);
    expect(hit("curto", 1, 30)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 45));

    expect(hit("curto", 1, 30)).toBe(true);
  });

  it("informa quantos segundos faltam para poder tentar de novo", () => {
    hit("espera", 1, 60_000);

    const segundos = retryAfter("espera");
    expect(segundos).toBeGreaterThan(0);
    expect(segundos).toBeLessThanOrEqual(60);
  });

  it("nunca devolve retryAfter de chave que nunca foi usada", () => {
    expect(retryAfter("inexistente")).toBe(0);
  });

  it("protege as rotas que custam dinheiro ou CPU", () => {
    // Se alguém afrouxar um destes sem pensar, o teste conta a história.
    expect(LIMITS.checkout.limit).toBeLessThanOrEqual(10);
    expect(LIMITS.qr.limit).toBeLessThanOrEqual(30);

    // Senha é a única barreira da página privada: janela longa, cota curta.
    expect(LIMITS.password.limit).toBeLessThanOrEqual(10);
    expect(LIMITS.password.windowMs).toBeGreaterThanOrEqual(60_000);
  });

  it("conta senha e QR por IP — limpar cookie não pode zerar a cota", () => {
    expect(LIMITS.password.by).toBe("ip");
    expect(LIMITS.qr.by).toBe("ip");
  });
});

/**
 * CGNAT — SPEC 1: 90% do tráfego é celular em 4G, e operadora móvel brasileira
 * entrega dezenas de pessoas pelo mesmo endereço público. Este bloco existe
 * porque contar só por IP transformaria o pico do Dia das Mães em recusa em
 * massa de gente legítima.
 */
describe("várias pessoas atrás do mesmo IP", () => {
  beforeEach(() => {
    resetLimits();
    fakeIp.value = "200.0.0.1";
    fakeAnon.value = null;
  });

  it("não faz um visitante gastar a cota do outro no mesmo IP", async () => {
    fakeAnon.value = "pessoa-a";
    for (let i = 0; i < LIMITS.drafts.limit; i++) {
      expect(await allow("drafts")).toBe(true);
    }
    expect(await allow("drafts")).toBe(false);

    // Mesmo IP, outra pessoa: chega com a cota inteira.
    fakeAnon.value = "pessoa-b";
    expect(await allow("drafts")).toBe(true);
  });

  it("ainda assim segura um script que forja cookie novo a cada chamada", async () => {
    const teto = LIMITS.drafts.limit * 10;
    let passaram = 0;

    // Cada chamada com identidade nova: o teto individual nunca fecha, e quem
    // segura é o teto do IP.
    for (let i = 0; i < teto + 20; i++) {
      fakeAnon.value = `forjado-${i}`;
      if (await allow("drafts")) passaram += 1;
    }

    expect(passaram).toBe(teto);
  });

  it("na senha, trocar de cookie não adianta — a conta é do IP", async () => {
    for (let i = 0; i < LIMITS.password.limit; i++) {
      fakeAnon.value = `cookie-${i}`;
      expect(await allow("password")).toBe(true);
    }

    fakeAnon.value = "cookie-novo-em-folha";
    expect(await allow("password")).toBe(false);
  });

  it("outro IP na senha continua com a cota cheia", async () => {
    for (let i = 0; i < LIMITS.password.limit; i++) {
      await allow("password");
    }
    expect(await allow("password")).toBe(false);

    fakeIp.value = "200.0.0.2";
    expect(await allow("password")).toBe(true);
  });
});
