/**
 * Pôsteres dos três clipes de clima da landing, a partir de `assets/mood/*.png`.
 *
 * A origem já nasce pequena (480×270): são quadros extraídos de vídeo gerado
 * por IA (Google Flow), capturados por navegador antes de ir a produção —
 * não há arquivo maior para tirar de outro lugar. Por isso não há recorte
 * nem redimensionamento aqui, só a conversão para os formatos que a web usa;
 * o cartão que exibe cada pôster foi desenhado para essa resolução (nunca
 * hero cheio, sempre cartão pequeno).
 *
 * Os vídeos (`public/mood/*.mp4`) não passam por este script: são os arquivos
 * crus do Flow, e este projeto não tem como recodificar vídeo — o ffmpeg
 * disponível no ambiente de teste só lê/escreve webm.
 *
 * Roda sob demanda: `node scripts/prepare-mood.mjs`
 */
import { existsSync, readdirSync, statSync } from "node:fs";

const SHARP_GLOB = "node_modules/.pnpm";
const sharpDir = readdirSync(SHARP_GLOB).find((d) => d.startsWith("sharp@"));
if (!sharpDir) {
  console.error("sharp nao encontrado no store do pnpm.");
  process.exit(1);
}
const { default: sharp } = await import(
  `file://${process.cwd()}/${SHARP_GLOB}/${sharpDir}/node_modules/sharp/lib/index.js`
);

const CLIPES = ["telefone", "fotos", "qrcode"];
const kb = (f) => Math.round(statSync(f).size / 1024);

for (const nome of CLIPES) {
  const origem = `assets/mood/${nome}.png`;
  if (!existsSync(origem)) {
    console.error(`${origem} nao encontrado.`);
    process.exit(1);
  }

  const avif = `public/mood/${nome}.avif`;
  const webp = `public/mood/${nome}.webp`;

  await sharp(origem).avif({ quality: 62 }).toFile(avif);
  await sharp(origem).webp({ quality: 78 }).toFile(webp);

  console.log(`${nome}: ${kb(avif)} KB avif, ${kb(webp)} KB webp`);
}
