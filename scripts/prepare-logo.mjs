/**
 * Prepara os arquivos da logo a partir de `public/logo.png`.
 *
 * O original é 800x800, 803 KB e tem fundo branco **opaco** — sobre o noir da
 * Câmara Escura isso apareceria como um adesivo claro, e o peso estoura o
 * limite de 250 KB por imagem da seção 10 do SPEC.
 *
 * O que este script faz:
 *  1. torna transparente o fundo quase-branco, por flood fill a partir das
 *     bordas — só o fundo conectado sai, os cremes de dentro do envelope ficam;
 *  2. recorta a margem vazia;
 *  3. gera logo-mark.png (512), logo-mark@2x/1x para a nav, e icon.png (512)
 *     para o favicon do App Router.
 *
 * Roda sob demanda, não no build: `node scripts/prepare-logo.mjs`
 */
import { existsSync, readdirSync } from "node:fs";

const SHARP_GLOB = "node_modules/.pnpm";
const sharpDir = readdirSync(SHARP_GLOB).find((d) => d.startsWith("sharp@"));
if (!sharpDir) {
  console.error("✗ sharp não encontrado no store do pnpm.");
  process.exit(1);
}
const { default: sharp } = await import(
  `file://${process.cwd()}/${SHARP_GLOB}/${sharpDir}/node_modules/sharp/lib/index.js`
);

const SOURCE = "public/logo.png";
if (!existsSync(SOURCE)) {
  console.error(`✗ ${SOURCE} não encontrado.`);
  process.exit(1);
}

/** Distância máxima do branco para considerar "fundo". */
const TOLERANCE = 14;

const { data, info } = await sharp(SOURCE)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const isBackgroundish = (index) =>
  data[index] >= 255 - TOLERANCE &&
  data[index + 1] >= 255 - TOLERANCE &&
  data[index + 2] >= 255 - TOLERANCE;

// Flood fill a partir das quatro bordas: só o fundo conectado vira transparente.
const visited = new Uint8Array(width * height);
const stack = [];

for (let x = 0; x < width; x++) {
  stack.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y++) {
  stack.push([0, y], [width - 1, y]);
}

let cleared = 0;

while (stack.length) {
  const point = stack.pop();
  if (!point) break;
  const [x, y] = point;
  if (x < 0 || y < 0 || x >= width || y >= height) continue;

  const flat = y * width + x;
  if (visited[flat]) continue;
  visited[flat] = 1;

  const index = flat * channels;
  if (!isBackgroundish(index)) continue;

  data[index + 3] = 0; // alpha = 0
  cleared++;

  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

const transparent = sharp(data, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 1 });

const trimmed = await transparent.toBuffer();

const outputs = [
  { file: "public/logo-mark.png", size: 512 },
  { file: "public/logo-mark-128.png", size: 128 },
  { file: "src/app/icon.png", size: 512 },
];

for (const { file, size } of outputs) {
  const out = await sharp(trimmed)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  await sharp(out).toFile(file);
  console.log(
    `✓ ${file.padEnd(28)} ${size}px  ${(out.length / 1024).toFixed(0)} KB`,
  );
}

console.log(
  `\nfundo removido: ${((100 * cleared) / (width * height)).toFixed(1)}% dos pixels`,
);
