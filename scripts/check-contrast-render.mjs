/**
 * Contraste do que a TELA mostra, nao do que os tokens dizem.
 *
 * O `check-contrast.mjs` le pares de tokens e calcula. Isso cobre texto sobre
 * cor chapada, que e a maior parte do site -- e nao cobre texto sobre uma
 * coisa que so existe depois de renderizada: o campo de ondas do hero, uma
 * foto, um degrade animado. Ali o fundo de cada letra e um pixel diferente.
 *
 * Este script abre a pagina de verdade, esconde o texto com
 * `visibility: hidden` (que preserva o layout, entao a caixa nao se move),
 * fotografa o fundo que sobrou e mede o PIOR pixel dentro da caixa de cada
 * elemento. Pior, nao medio: o contraste falha na letra que caiu em cima da
 * onda, nao na media da linha.
 *
 * Ele pegou uma regressao de verdade quando as ondas entraram: a lede do
 * desktop em 2,43:1 e o eyebrow do celular em 1,61:1, contra os 4,5 exigidos.
 * Nenhum dos dois aparecia no medidor de tokens, porque nenhum dos dois e um
 * par de tokens.
 *
 * Precisa do servidor no ar:
 *
 *     pnpm build && pnpm start
 *     node scripts/check-contrast-render.mjs
 *
 * Sai com codigo 1 se algum par reprovar.
 */
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";

/** Servidor a inspecionar. A build de verificacao roda em outra porta para
 *  nao brigar com o `next dev` (ver `distDir` em next.config.ts):
 *
 *      BASE_URL=http://localhost:3010 node scripts/<este arquivo>
 */
const BASE = process.env.BASE_URL ?? BASE;

const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = (r, g, b) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
const razao = (a, b) => {
  const [x, y] = [lum(...a), lum(...b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const ALVOS = [
  [".eyebrow", 4.5],
  [".hero__title", 3.0],
  [".hero__lede", 4.5],
  [".hero__social", 4.5],
  [".hero__actions .btn-quiet", 4.5],
];

let reprovou = false;

const nav = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

for (const [nome, vp] of [
  ["desktop", { width: 1440, height: 900 }],
  ["celular", { width: 390, height: 844 }],
]) {
  const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil: "networkidle" });
  await pg.waitForTimeout(3000);

  const medidas = [];
  for (const [sel, minimo] of ALVOS) {
    const el = pg.locator(sel).first();
    if ((await el.count()) === 0) continue;
    const caixa = await el.boundingBox();
    const cor = await el.evaluate((n) => getComputedStyle(n).color);
    if (caixa) medidas.push({ sel, minimo, caixa, cor });
  }

  // Esconde o texto SEM mudar o layout: sobra exatamente o fundo que estava
  // atras dele.
  await pg.addStyleTag({
    content: ".hero__copy { visibility: hidden !important; }",
  });
  await pg.waitForTimeout(1200);
  const arquivo = `${process.env.TMP}/fundo-${nome}.png`;
  await pg.screenshot({ path: arquivo, fullPage: true, timeout: 120000 });

  const png = PNG.sync.read(readFileSync(arquivo));
  console.log(`\n== ${nome} (${vp.width}x${vp.height}) ==`);

  for (const { sel, minimo, caixa, cor } of medidas) {
    const [tr, tg, tb] = cor.match(/\d+/g).map(Number);
    let pior = Infinity;
    let piorPx = null;
    const x0 = Math.max(0, Math.floor(caixa.x));
    const y0 = Math.max(0, Math.floor(caixa.y));
    const x1 = Math.min(png.width, Math.ceil(caixa.x + caixa.width));
    const y1 = Math.min(png.height, Math.ceil(caixa.y + caixa.height));

    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (png.width * y + x) << 2;
        const px = [png.data[i], png.data[i + 1], png.data[i + 2]];
        const r = razao([tr, tg, tb], px);
        if (r < pior) {
          pior = r;
          piorPx = px;
        }
      }
    }
    if (piorPx === null) {
      console.log(`SEM DADOS ${sel} — caixa fora da imagem`);
      continue;
    }
    const passa = pior >= minimo;
    if (!passa) reprovou = true;
    console.log(
      `${passa ? "OK " : "FALHA"} ${sel.padEnd(26)} pior=${pior.toFixed(2)}:1 (min ${minimo}) fundo=rgb(${piorPx})`,
    );
  }
  await ctx.close();
}

await nav.close();

if (reprovou) {
  console.error("");
  console.error("Contraste medido na tela REPROVOU (CLAUDE.md, regra 15).");
  process.exit(1);
}
console.log("");
console.log("Todos os alvos medidos passam.");
