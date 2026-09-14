import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { readAnonId } from "@/lib/anon";
import { HOSTED } from "@/lib/env";

/**
 * Limite de requisições por IP — SPEC 9.4.
 *
 * Existe porque três rotas do funil custam dinheiro ou CPU a cada chamada:
 * `/api/qr` gera um PDF A6 (segundos de CPU), `/api/checkout` abre uma cobrança
 * de verdade no Mercado Pago e `/api/upload/sign` emite permissão de escrita no
 * R2. Sem teto, um laço de dez linhas derruba o app ou queima a fatura — e o
 * pico sazonal de 50x (SPEC 1) não deixa margem para descobrir isso no dia.
 *
 * Janela deslizante em memória. Na Vercel cada instância tem a sua, então o teto
 * real é "N por instância": não é cota exata, é freio contra script. Quando
 * houver Redis, troque o `Map` por ele sem mexer em quem chama.
 *
 * **Por que não é tudo por IP.** 90% do tráfego é celular em 4G (SPEC 1), e no
 * Brasil a operadora móvel entrega CGNAT: centenas de pessoas saem pelo mesmo
 * endereço público. Contar só por IP faria a mãe que está montando a página do
 * filho pagar pelo vizinho que montou seis — justamente no Dia das Mães, que é
 * o pico que a SPEC manda projetar.
 *
 * Então cada rota declara em que chave ela conta:
 *  - `identity` — rotas do funil, onde já existe o cookie anônimo. Conta por
 *    pessoa, com um teto de IP dez vezes mais folgado por cima, que só existe
 *    para pegar script (script sem cookie cai no teto de IP; script que forja
 *    cookie novo a cada chamada esbarra nesse mesmo teto);
 *  - `ip` — rotas anônimas de verdade (senha da página, QR), onde deixar a
 *    pessoa zerar a cota limpando cookie seria o mesmo que não ter cota.
 *
 * LGPD: a chave vive em memória pelo tempo da janela e some. Nada vai para o
 * banco nem para o log.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Acima disso, faz uma varredura dos vencidos antes de crescer mais. */
const MAX_BUCKETS = 10_000;

/**
 * Dose por rota. Um lugar só, para o teto ser lido de relance em vez de caçado
 * handler por handler.
 */
interface Limit {
  /** cota da chave principal */
  limit: number;
  windowMs: number;
  /** em que chave contar — ver o comentário do módulo */
  by: "identity" | "ip";
}

export const LIMITS = {
  /** PDF/PNG do QR: caro de gerar e pedido por quem não tem cookie nenhum. */
  qr: { limit: 20, windowMs: 60_000, by: "ip" },
  /** Cada chamada abre uma cobrança real no provedor. */
  checkout: { limit: 5, windowMs: 60_000, by: "identity" },
  /** Rascunho é gratuito e sem login: o teto é o que impede encher o banco. */
  drafts: { limit: 10, windowMs: 60_000, by: "identity" },
  /** 60 fotos é o maior plano; uma janela comporta um álbum inteiro. */
  upload: { limit: 60, windowMs: 60_000, by: "identity" },
  /** Visita: generoso, porque a página pode viralizar de verdade. */
  view: { limit: 30, windowMs: 60_000, by: "ip" },
  /** Senha da página: limpar cookie não pode zerar a cota. */
  password: { limit: 8, windowMs: 300_000, by: "ip" },
} as const satisfies Record<string, Limit>;

/**
 * Folga do teto por IP nas rotas contadas por pessoa. Dez vezes a cota
 * individual: cabe um prédio inteiro atrás do mesmo CGNAT, não cabe um laço.
 */
const IP_MULTIPLIER = 10;

/**
 * Folga para o e2e, que é um cliente legítimo de alto volume num IP só: ele
 * percorre o funil inteiro várias vezes por minuto, que é exatamente o padrão
 * que o teto existe para barrar.
 *
 * **Só vale fora de um host.** Num deploy (`lib/env.ts` → `HOSTED`) o valor é
 * ignorado, então ninguém afrouxa a produção por engano deixando a variável
 * ligada — e o que prova que o limitador funciona são os unitários de
 * `rate-limit.test.ts`, que não dependem dela.
 */
const TEST_SLACK = HOSTED
  ? 1
  : Math.max(
      Math.floor(Number(process.env.RATE_LIMIT_TEST_SLACK ?? 1)) || 1,
      1,
    );

export type LimitName = keyof typeof LIMITS;

/**
 * IP de quem chamou. Atrás da Vercel e do Cloudflare o socket é do proxy, então
 * o que vale é o primeiro salto do `x-forwarded-for`.
 */
export async function clientIp(): Promise<string> {
  const store = await headers();

  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    store.get("x-real-ip")?.trim() ??
    "desconhecido"
  );
}

/** Consome uma ficha. `false` quando a janela já estourou. */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Segundos até a janela abrir de novo — vira o `retry-after`. */
export function retryAfter(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(Math.ceil((bucket.resetAt - Date.now()) / 1000), 1);
}

/**
 * Consome a cota da rota. Devolve a chave estourada, ou `null` quando passou.
 *
 * Numa rota `identity` são dois tetos: o da pessoa (apertado) e o do IP
 * (folgado). Os dois precisam passar, e o segundo só é cobrado depois do
 * primeiro — assim o vizinho de CGNAT que ainda está dentro da própria cota
 * não gasta a cota coletiva à toa.
 */
async function consume(name: LimitName): Promise<string | null> {
  const { limit, windowMs, by } = LIMITS[name];
  const ip = await clientIp();

  if (by === "ip") {
    const key = `${name}:ip:${ip}`;
    return hit(key, limit * TEST_SLACK, windowMs) ? null : key;
  }

  const identity = await readAnonId();

  // Primeira visita ainda não tem cookie — é justamente a chamada que vai criar
  // o dela. Cobrar a cota individual de um visitante sem identidade obrigaria a
  // usar o IP como se fosse pessoa, e aí toda a operadora móvel disputaria dez
  // fichas por minuto: o castigo de CGNAT que este desenho existe para evitar.
  // Quem não tem identidade responde só ao teto coletivo, que é o que segura
  // script de qualquer jeito.
  if (identity) {
    const own = `${name}:u:${identity}`;
    if (!hit(own, limit * TEST_SLACK, windowMs)) return own;
  }

  const shared = `${name}:ip:${ip}`;
  if (!hit(shared, limit * IP_MULTIPLIER * TEST_SLACK, windowMs)) return shared;

  return null;
}

/**
 * Guarda de Route Handler: devolve a recusa pronta, ou `null` quando pode seguir.
 *
 * ```ts
 * const limited = await limitOr429("qr");
 * if (limited) return limited;
 * ```
 *
 * A mensagem segue a voz da interface (SPEC 11): diz o que houve e o que fazer,
 * sem pedir desculpa e sem ser vaga.
 */
export async function limitOr429(
  name: LimitName,
  message = "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
): Promise<NextResponse | null> {
  const blocked = await consume(name);
  if (!blocked) return null;

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "retry-after": String(retryAfter(blocked)) },
    },
  );
}

/**
 * Versão para Server Action, onde não existe resposta HTTP para devolver.
 * `true` = pode seguir.
 */
export async function allow(name: LimitName): Promise<boolean> {
  return (await consume(name)) === null;
}

/** Só para teste: zera o estado entre casos. */
export function resetLimits(): void {
  buckets.clear();
}
