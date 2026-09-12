import { join } from "node:path";

/**
 * Raiz do backend de arquivo — o `.drafts/` que substitui o Postgres quando não
 * há `DATABASE_URL` (ver `lib/drafts.ts`).
 *
 * É uma **função**, não uma constante, por um motivo específico: cada arquivo de
 * teste precisa da sua própria pasta. Antes todos gravavam no mesmo diretório e
 * rodavam em paralelo, então o `afterAll` de uma suíte apagava os dados de outra
 * no meio da execução — e o job de purga, que varre tudo que expirou, apagava as
 * páginas de quem estivesse rodando ao lado. Os testes passavam sozinhos e
 * falhavam juntos, que é o jeito mais caro de descobrir qualquer coisa.
 *
 * Em produção a variável nunca é preenchida e isto devolve `.drafts` — e em
 * produção nem o backend de arquivo existe, porque há banco.
 */
export function devRoot(): string {
  const custom = process.env.REVELADO_DEV_DIR;
  return custom ? custom : join(process.cwd(), ".drafts");
}

/** Subpasta da raiz: `devPath("orders")`, `devPath("media")`. */
export function devPath(...segments: string[]): string {
  return join(devRoot(), ...segments);
}
