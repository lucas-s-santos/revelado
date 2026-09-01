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
/* Tokens que são NÚMERO puro, não cor: as opacidades. Existem porque um par
 * pode reprovar sem nenhuma cor mudar — basta o elemento ser apagado. */
const NUM = /--([\w-]+):\s*([\d.]+)\s*;/g;

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

/** Idem, para os tokens numéricos. */
function numbersOf(selector) {
  const out = {};
  let from = 0;
  for (;;) {
    const start = css.indexOf(selector, from);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    const end = css.indexOf("}", open);
    for (const [, name, v] of css.slice(open, end).matchAll(NUM)) {
      out[name] = Number(v);
    }
    from = end;
  }
  return out;
}

// As paletas da pele clara não moram no @theme: ficam num `:root` separado,
// logo abaixo. Sem ler os dois blocos, metade das cores escolhíveis pelo
// editor nunca era medida.
const clara = { ...tokensOf("@theme"), ...tokensOf(":root {") };
const escura = { ...clara, ...tokensOf('[data-skin="escura"]') };

// `--color-accent` na pele escura é `var(--palette-magenta)`: resolve na mão,
// senão o par cai no accent da pele clara e mede a comparação errada.
escura["color-accent"] = escura["palette-magenta"];

const numClara = numbersOf("@theme");
const numEscura = { ...numClara, ...numbersOf('[data-skin="escura"]') };

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** Cor efetiva de um texto apagado: alfa sobre o fundo, canal a canal. */
const over = (fg, bg, alpha) => fg.map((c, i) => bg[i] + (c - bg[i]) * alpha);

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** [pele, texto, fundo, mínimo, o que é, alfa?, tinta?]
 *
 * O alfa existe porque contraste não depende só das cores declaradas. Um
 * elemento apagado por opacity mistura a tinta com o fundo e derruba a razão
 * sem que token nenhum mude — foi assim que o texto do passo inativo em
 * "Como funciona" ficou em 2.46:1 sem nada aqui acusar.
 *
 * `tinta` é o caso inverso, e faltava: o FUNDO é que vem com alfa. As células
 * do contador e do bloco de números são `--color-accent / 0.07` sobre a
 * página, e o texto por cima é opaco. Medir contra `--color-bg` puro dava um
 * número otimista, porque a tinta escurece o fundo e aproxima as duas cores.
 * `tinta` é `[token, alfa]` e compõe o fundo antes da conta. */
const PARES = [
  ["clara", "color-ink", "color-bg", 4.5, "corpo sobre o fundo"],
  ["clara", "color-ink", "color-surface", 4.5, "corpo no cartão"],
  ["clara", "color-ink", "color-surface-2", 4.5, "corpo na superfície elevada"],
  ["clara", "color-ink-muted", "color-bg", 4.5, "secundário sobre o fundo"],
  ["clara", "color-ink-muted", "color-surface", 4.5, "secundário no cartão"],
  ["clara", "color-accent", "color-bg", 4.5, "link/eyebrow sobre o fundo"],
  ["clara", "color-accent", "color-surface", 4.5, "link/eyebrow no cartão"],
  // As células do contador: fundo `accent / 0.07`. (As do bloco de números
  // deixaram de ser tingidas — passaram a contorno sobre a própria página,
  // então caem nos pares `accent`/`ink-muted` sobre `color-bg` acima.)
  ["clara", "color-accent", "color-bg", 4.5, "número na célula tingida", undefined, ["color-accent", 0.07]],
  ["clara", "color-ink-muted", "color-bg", 4.5, "rótulo na célula tingida", undefined, ["color-accent", 0.07]],
  ["escura", "color-accent", "color-bg", 4.5, "número na célula tingida", undefined, ["color-accent", 0.07]],
  ["escura", "color-ink-muted", "color-bg", 4.5, "rótulo na célula tingida", undefined, ["color-accent", 0.07]],
  ["clara", "color-on-brand", "color-brand", 4.5, "texto do botão primário"],
  ["clara", "color-on-safelight", "color-safelight", 4.5, "selo de plano sobre âmbar"],
  ["clara", "color-on-brand", "color-accent", 4.5, "texto no fim do gradiente do CTA"],
  ["clara", "color-accent", "color-on-brand", 4.5, "botão invertido dentro do CTA"],
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

/* "Como funciona": o ato inativo é apagado, e apagar texto custa contraste.
 *
 * A prosa e a eyebrow levam só o piso do ato. O título leva o piso VEZES o
 * dim dele — opacidade aninhada multiplica —, e por ter 36px é medido contra
 * 3:1, o mínimo de texto grande, e não contra 4.5:1. */
for (const [pele, nums] of [
  ["clara", numClara],
  ["escura", numEscura],
]) {
  const piso = nums["act-floor"];
  const dim = nums["act-dim"];
  if (piso === undefined || dim === undefined) {
    throw new Error(`--act-floor/--act-dim ausentes na pele ${pele}`);
  }
  PARES.push([pele, "color-ink-muted", "color-bg", 4.5, "ato inativo: prosa e eyebrow", piso]);
  PARES.push([pele, "color-ink", "color-bg", 3, "ato inativo: título (texto grande)", piso * dim]);
}

/* Cada paleta é um --color-accent possível: a pessoa escolhe no editor e a
 * cor entra como texto (eyebrow, link, rótulo) sobre o fundo e sobre o cartão.
 * Medir só o accent padrão deixaria as outras passarem sem ninguém olhar —
 * que é exatamente onde uma cor bonita e ilegível se esconde. */
for (const [nome, valor] of Object.entries(clara)) {
  if (!nome.startsWith("palette-")) continue;
  const id = nome.slice("palette-".length);
  PARES.push(["clara", nome, "color-bg", 4.5, `paleta ${id} sobre o fundo`]);
  PARES.push(["clara", nome, "color-surface", 4.5, `paleta ${id} no cartão`]);
  void valor;
}

for (const nome of Object.keys(escura)) {
  if (!nome.startsWith("palette-")) continue;
  const id = nome.slice("palette-".length);
  PARES.push(["escura", nome, "color-bg", 4.5, `paleta ${id} sobre o fundo`]);
  PARES.push(["escura", nome, "color-surface", 4.5, `paleta ${id} no cartão`]);
}

let falhas = 0;
console.log("");
for (const [pele, fgName, bgName, min, label, alpha, tinta] of PARES) {
  const tokens = pele === "clara" ? clara : escura;
  const fg = tokens[fgName];
  const base = tokens[bgName];
  if (!fg || !base) {
    console.log(`  ?  ${pele.padEnd(6)} token ausente: ${!fg ? fgName : bgName}`);
    falhas++;
    continue;
  }

  // Fundo tingido: compõe a tinta sobre a superfície antes de medir.
  let bg = base;
  if (tinta) {
    const [tintaName, tintaAlpha] = tinta;
    const cor = tokens[tintaName];
    if (!cor) {
      console.log(`  ?  ${pele.padEnd(6)} token ausente: ${tintaName}`);
      falhas++;
      continue;
    }
    bg = over(cor, base, tintaAlpha);
  }

  const r = ratio(alpha === undefined ? fg : over(fg, bg, alpha), bg);
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
