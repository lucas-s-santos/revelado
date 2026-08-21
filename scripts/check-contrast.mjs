/* Contraste se mede, não se estima (CLAUDE.md, regra 15).
 *
 * Lê os tokens direto de styles/theme.css e roda o cálculo WCAG 2.1 em cada
 * par que existe de verdade na interface. Cor nova só entra depois de passar
 * aqui — e texto sobre foto pede folga sobre os 4.5:1, não o valor no limite,
 * por isso alguns pares exigem mais que o mínimo da norma.
 *
 * pnpm contrast
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/theme.css", import.meta.url), "utf8");
const DECL = /--([\w-]+):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g;

/** Tokens de TODOS os blocos com este seletor. O theme.css declara
 * `[data-skin="escura"]` duas vezes — pele e paletas — e as duas contam. */
function tokensOf(selector) {
  const out = {};
  let from = 0;
  let achou = false;
  for (;;) {
    const start = css.indexOf(selector, from);
    if (start === -1) break;
    achou = true;
    const open = css.indexOf("{", start);
    const end = css.indexOf("}", open);
    for (const [, name, r, g, b] of css.slice(open, end).matchAll(DECL)) {
      out[name] = [Number(r), Number(g), Number(b)];
    }
    from = end;
  }
  if (!achou) throw new Error(`bloco não encontrado: ${selector}`);
  return out;
}

const clara = tokensOf("@theme");
const escura = { ...clara, ...tokensOf('[data-skin="escura"]') };

// `--color-accent` na pele escura é `var(--palette-magenta)`: resolve na mão,
// senão o par cai no accent da pele clara e mede a comparação errada.
escura["color-accent"] = escura["palette-magenta"];

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** [pele, texto, fundo, mínimo, o que é] */
const PARES = [
  ["clara", "color-ink", "color-bg", 4.5, "corpo sobre o fundo"],
  ["clara", "color-ink", "color-surface", 4.5, "corpo no cartão"],
  ["clara", "color-ink", "color-surface-2", 4.5, "corpo na superfície elevada"],
  ["clara", "color-ink-muted", "color-bg", 4.5, "secundário sobre o fundo"],
  ["clara", "color-ink-muted", "color-surface", 4.5, "secundário no cartão"],
  ["clara", "color-accent", "color-bg", 4.5, "link/eyebrow sobre o fundo"],
  ["clara", "color-accent", "color-surface", 4.5, "link/eyebrow no cartão"],
  ["clara", "color-on-brand", "color-brand", 4.5, "texto do botão primário"],
  ["clara", "color-ink", "color-hero-wash", 6, "h1 sobre a foto do hero (folga)"],
  ["clara", "color-danger", "color-surface", 4.5, "erro de formulário"],
  ["clara", "color-success", "color-surface", 4.5, "confirmação"],
  ["clara", "color-ink", "color-card-rose", 4.5, "texto no cartão do contador"],
  ["clara", "color-ink", "color-card-lilac", 4.5, "texto no cartão do álbum"],
  ["clara", "color-ink", "color-card-cream", 4.5, "texto no cartão da música"],
  ["clara", "color-ink-on-deep", "color-card-deep", 4.5, "texto no cartão escuro"],
  ["clara", "color-ink-on-deep", "color-deep", 4.5, "corpo na seção vinho"],
  ["clara", "color-muted-on-deep", "color-deep", 4.5, "secundário na seção vinho"],
  ["clara", "color-brand-on-deep", "color-deep", 4.5, "eyebrow na seção vinho"],
  ["escura", "color-ink", "color-bg", 4.5, "corpo sobre o fundo"],
  ["escura", "color-ink", "color-surface", 4.5, "corpo no cartão"],
  ["escura", "color-ink-muted", "color-bg", 4.5, "secundário sobre o fundo"],
  ["escura", "color-accent", "color-bg", 4.5, "accent sobre o fundo"],
];

let falhas = 0;
console.log("");
for (const [pele, fgName, bgName, min, label] of PARES) {
  const tokens = pele === "clara" ? clara : escura;
  const fg = tokens[fgName];
  const bg = tokens[bgName];
  if (!fg || !bg) {
    console.log(`  ?  ${pele.padEnd(6)} token ausente: ${!fg ? fgName : bgName}`);
    falhas++;
    continue;
  }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) falhas++;
  console.log(
    `  ${ok ? "ok" : "XX"} ${pele.padEnd(6)} ${r.toFixed(2).padStart(5)}:1  min ${min}  ${label}`,
  );
}

console.log("");
if (falhas > 0) {
  console.error(`${falhas} par(es) abaixo do mínimo. Escureça a cor ou troque o fundo.\n`);
  process.exit(1);
}
console.log("Todos os pares passam.\n");
