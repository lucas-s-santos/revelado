/**
 * Fotos da página de exemplo, a partir de `assets/hero.png`.
 *
 * A galeria do exemplo aponta para `demo-1`..`demo-4`, ids que nunca foram
 * enviados: o resolvedor devolvia uma URL que dava 404 e a página de exemplo
 * — justamente a que a pessoa abre para decidir comprar — mostrava quatro
 * ícones de imagem quebrada.
 *
 * Não invento foto de casal: o que sai daqui são quatro recortes atmosféricos
 * do mesmo pôr do sol que o projeto já tem, tratados de forma diferente para
 * lerem como um pequeno conjunto. É ilustração de produto, não retrato de
 * ninguém.
 *
 * Roda sob demanda: `node scripts/prepare-demo.mjs`
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";

const SHARP_GLOB = "node_modules/.pnpm";
const sharpDir = readdirSync(SHARP_GLOB).find((d) => d.startsWith("sharp@"));
if (!sharpDir) {
  console.error("sharp nao encontrado no store do pnpm.");
  process.exit(1);
}
const { default: sharp } = await import(
  `file://${process.cwd()}/${SHARP_GLOB}/${sharpDir}/node_modules/sharp/lib/index.js`
);

const SOURCE = "assets/hero.png";
if (!existsSync(SOURCE)) {
  console.error(`${SOURCE} nao encontrado.`);
  process.exit(1);
}

mkdirSync("public/demo", { recursive: true });

const meta = await sharp(SOURCE).metadata();
const W = meta.width ?? 1718;
const H = meta.height ?? 915;

/* Quatro recortes do mesmo original, com tratamento próprio. Larguras de 900
   bastam: no carrossel elas nunca passam de meia tela. */
const RECORTES = [
  { nome: "demo-1", left: 0, top: 0, w: 0.52, h: 0.9, mod: (i) => i.modulate({ saturation: 1.05 }) },
  { nome: "demo-2", left: 0.28, top: 0.08, w: 0.44, h: 0.82, mod: (i) => i.modulate({ brightness: 1.06, saturation: 0.86 }) },
  { nome: "demo-3", left: 0.48, top: 0, w: 0.52, h: 0.9, mod: (i) => i.modulate({ saturation: 0.7 }).tint({ r: 255, g: 244, b: 236 }) },
  { nome: "demo-4", left: 0.2, top: 0.16, w: 0.4, h: 0.74, mod: (i) => i.modulate({ brightness: 0.96, saturation: 1.12 }) },
];

const kb = (f) => Math.round(statSync(f).size / 1024);

for (const r of RECORTES) {
  const recorte = sharp(SOURCE).extract({
    left: Math.round(W * r.left),
    top: Math.round(H * r.top),
    width: Math.round(W * r.w),
    height: Math.round(H * r.h),
  });

  const tratado = r.mod(recorte).resize({ width: 900, withoutEnlargement: true });

  await tratado.clone().webp({ quality: 76 }).toFile(`public/demo/${r.nome}.webp`);
  console.log(`  ${r.nome}.webp — ${kb(`public/demo/${r.nome}.webp`)}KB`);
}

console.log("fotos do exemplo em public/demo/");
