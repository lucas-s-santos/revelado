import { NextResponse } from "next/server";
import { headers } from "next/headers";

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
 * LGPD: a chave é o IP, que **nunca** é gravado — vive em memória pelo tempo da
 * janela e some. Nada disso vai para o banco nem para o log.
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
export const LIMITS = {
  /** PDF/PNG do QR: caro de gerar, imutável depois de pronto. */
  qr: { limit: 20, windowMs: 60_000 },
  /** Cada chamada abre uma cobrança real no provedor. */
  checkout: { limit: 5, windowMs: 60_000 },
  /** Rascunho é gratuito e sem login: o teto é o que impede encher o banco. */
  drafts: { limit: 10, windowMs: 60_000 },
  /** 60 fotos é o maior plano; uma janela comporta um álbum inteiro. */
  upload: { limit: 60, windowMs: 60_000 },
  /** Contador de visita: generoso, porque a página pode viralizar de verdade. */
  view: { limit: 30, windowMs: 60_000 },
  /** Senha da página: o único teto que existe contra força bruta. */
  password: { limit: 8, windowMs: 300_000 },
} as const;

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
  const { limit, windowMs } = LIMITS[name];
  const key = `${name}:${await clientIp()}`;

  if (hit(key, limit, windowMs)) return null;

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "retry-after": String(retryAfter(key)) },
    },
  );
}

/**
 * Versão para Server Action, onde não existe resposta HTTP para devolver.
 * `true` = pode seguir.
 */
export async function allow(name: LimitName): Promise<boolean> {
  const { limit, windowMs } = LIMITS[name];
  return hit(`${name}:${await clientIp()}`, limit, windowMs);
}

/** Só para teste: zera o estado entre casos. */
export function resetLimits(): void {
  buckets.clear();
}
