/**
 * Varredura de todas as telas: captura cada uma e acusa o que da para medir.
 *
 * Nasceu de uma avaliacao de "o sistema esta feio e falho" e achou, em uma
 * passada, o que ninguem tinha visto olhando: TODO css e js voltando HTTP 400
 * (um `next dev` havia sobrescrito o `.next` da build de producao, e a pagina
 * abria sem estilo nenhum) e o celular da previa cortado por 11px.
 *
 * O que ele checa sozinho, sem depender de alguem olhar a imagem:
 *   - erro de JavaScript e de console
 *   - qualquer resposta HTTP >= 400, inclusive de asset
 *   - barra de rolagem horizontal na pagina
 *   - o aparelho da previa estourando a faixa que o contem
 *
 * As capturas ficam no diretorio temporario, para leitura humana depois.
 *
 * Precisa do servidor no ar:
 *
 *     NEXT_DIST_DIR=.next-verify pnpm build
 *     NEXT_DIST_DIR=.next-verify pnpm next start -p 3010
 *     BASE_URL=http://localhost:3010 node scripts/check-telas.mjs
 *
 * Sai com codigo 1 se achar problema.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

/** Servidor a inspecionar. A build de verificacao roda em outra porta para
 *  nao brigar com o `next dev` (ver `distDir` em next.config.ts):
 *
 *      BASE_URL=http://localhost:3010 node scripts/<este arquivo>
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const SAIDA = `${process.env.TMP}/auditoria`;
mkdirSync(SAIDA, { recursive: true });

const nav = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

const problemas = [];

async function novaPagina(vp) {
  const ctx = await nav.newContext({ viewport: vp, locale: "pt-BR" });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => problemas.push(`JS: ${String(e).slice(0, 140)}`));
  pg.on("console", (m) => {
    if (m.type() === "error") problemas.push(`console: ${m.text().slice(0, 140)}`);
  });
  pg.on("response", (r) => {
    if (r.status() >= 400) problemas.push(`HTTP ${r.status()}: ${r.url().slice(-70)}`);
  });
  return { ctx, pg };
}

/** Barra horizontal na página inteira é defeito, não estilo. */
async function checaEstouro(pg, onde) {
  const estoura = await pg.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (estoura) problemas.push(`ESTOURO horizontal em ${onde}`);
}

const vp = { width: 390, height: 844 };
const { ctx, pg } = await novaPagina(vp);

// 1. landing
await pg.goto(BASE, { waitUntil: "networkidle" });
await pg.waitForTimeout(2500);
await pg.screenshot({ path: `${SAIDA}/01-landing.png`, fullPage: true, timeout: 120000 });
await checaEstouro(pg, "landing");

// 2. criar
await pg.goto(`${BASE}/criar`, { waitUntil: "networkidle" });
await pg.waitForTimeout(1200);
await pg.screenshot({ path: `${SAIDA}/02-criar.png`, fullPage: true, timeout: 120000 });
await checaEstouro(pg, "/criar");

/** O celular da previa nao pode estourar a faixa: o corte reto na base le
 *  como bug. Isto ja passou despercebido duas vezes por eu estimar em vez de
 *  medir -- a moldura soma padding, e a conta "720 x escala" nao fecha. */
async function checaPrevia(pg) {
  const m = await pg.evaluate(() => {
    const faixa = document.querySelector(".editor__preview");
    const fone = document.querySelector(".editor__phone");
    if (!faixa || !fone) return null;
    const rf = faixa.getBoundingClientRect();
    const rp = fone.getBoundingClientRect();
    return { sobraBase: rp.bottom - rf.bottom, sobraTopo: rf.top - rp.top };
  });
  if (!m) return;
  if (m.sobraBase > 1 || m.sobraTopo > 1) {
    problemas.push(
      `CELULAR CORTADO na previa: ${Math.round(m.sobraBase)}px abaixo, ${Math.round(m.sobraTopo)}px acima`,
    );
  }
}

// 3. editor, passo a passo
await pg.locator("form button, button[type=submit]").first().click();
await pg.waitForURL(/\/editor\//, { timeout: 40000 });
await pg.waitForTimeout(2500);

const total = await pg.locator(".editor__dot").count();
for (let i = 0; i < total; i++) {
  await pg.locator(".editor__dot").nth(i).click();
  await pg.waitForTimeout(700);
  const titulo = await pg
    .locator(".step__title")
    .first()
    .innerText()
    .catch(() => "?");
  await pg.screenshot({
    path: `${SAIDA}/03-editor-${String(i).padStart(2, "0")}.png`,
    timeout: 120000,
  });
  await checaEstouro(pg, `editor passo ${i} (${titulo})`);
  if (i === 0) await checaPrevia(pg);
}

// 4. página publicada (exemplo)
await pg.goto(`${BASE}/p/exemplo-marina-e-teo`, { waitUntil: "networkidle" });
await pg.waitForTimeout(1500);
await pg.screenshot({ path: `${SAIDA}/04-portal.png`, timeout: 120000 });
await pg.locator(".portal__botao").click();
await pg.waitForTimeout(2500);
await pg.screenshot({ path: `${SAIDA}/05-publicada.png`, fullPage: true, timeout: 120000 });
await checaEstouro(pg, "página publicada");

await ctx.close();

// 5. desktop: landing inteira
const { ctx: c2, pg: p2 } = await novaPagina({ width: 1440, height: 900 });
await p2.goto(BASE, { waitUntil: "networkidle" });
await p2.waitForTimeout(2500);
await p2.screenshot({ path: `${SAIDA}/06-landing-desktop.png`, fullPage: true, timeout: 120000 });
await checaEstouro(p2, "landing desktop");
await c2.close();

await nav.close();

console.log(`capturas em ${SAIDA}`);
console.log(`passos do editor: ${total}`);
console.log("\n=== PROBLEMAS ===");
if (problemas.length === 0) console.log("nenhum erro de runtime, HTTP ou estouro");
else {
  [...new Set(problemas)].forEach((p) => console.log("  - " + p));
  process.exit(1);
}
