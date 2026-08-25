/**
 * Prepara o mascote a partir de `nimbo-3d.png`.
 *
 * O original tem 900x960 e 1.164 KB — 4,6x o teto de 250 KB por imagem da
 * seção 10 do SPEC. Cru, ele sozinho custaria mais que a landing inteira.
 *
 * O que este script faz:
 *  1. corta a moldura transparente que sobra em volta do desenho;
 *  2. exporta AVIF + WebP em duas larguras (a de mobile e a de desktop);
 *  3. gera uma prova do mascote SOBRE O FUNDO ROSA do site — é como ele vai
 *     aparecer de verdade, e é o único jeito de ver se as áreas transparentes
 *     (os olhos) viram buraco na pele clara.
 *
 * Roda sob demanda, não no build: `node scripts/prepare-nimbo.mjs`
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";

const SHARP_GLOB = "node_modules/.pnpm";
const sharpDir = readdirSync(SHARP_GLOB).find((d) => d.startsWith("sharp@"));
if (!sharpDir) {
  console.error("✗ sharp não encontrado no store do pnpm.");
  process.exit(1);
}
const { default: sharp } = await import(
  `file://${process.cwd()}/${SHARP_GLOB}/${sharpDir}/node_modules/sharp/lib/index.js`
);

const SOURCE = "nimbo-3d.png";
if (!existsSync(SOURCE)) {
  console.error(`✗ ${SOURCE} não encontrado.`);
  process.exit(1);
}

mkdirSync("public", { recursive: true });
// A prova é conferência, não asset do site: fica fora de public/.
mkdirSync("assets", { recursive: true });

/* O fundo da pele clara — --color-bg do theme.css. */
const BG = { r: 255, g: 245, b: 248 };

/**
 * OS OLHOS SÃO FUROS. O PNG vem com as órbitas transparentes, então sobre o
 * fundo claro do site elas viram dois ovais da cor da página e o mascote fica
 * cego. Sobre fundo escuro passava despercebido; a pele clara é o padrão.
 *
 * Como distinguir furo de fundo: o fundo encosta na borda da imagem, o furo
 * não. Então varre a partir das bordas marcando todo transparente alcançável —
 * o que sobrar de transparente está DENTRO da silhueta, e é olho.
 *
 * Devolve `{ data, info, buracos }`, com um bounding box por furo encontrado.
 */
async function acharBuracos(imagem) {
  const { data, info } = await imagem
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const alphaEm = (i) => data[i * channels + channels - 1];
  const VAZIO = 40;

  const exterior = new Uint8Array(width * height);
  const fila = [];

  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = y * width + x;
      if (alphaEm(i) < VAZIO && !exterior[i]) { exterior[i] = 1; fila.push(i); }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const i = y * width + x;
      if (alphaEm(i) < VAZIO && !exterior[i]) { exterior[i] = 1; fila.push(i); }
    }
  }

  // Varredura em largura a partir das bordas: tudo que ela alcança é fundo.
  while (fila.length) {
    const i = fila.pop();
    const x = i % width;
    const y = (i - x) / width;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

      const j = ny * width + nx;
      if (exterior[j] || alphaEm(j) >= VAZIO) continue;
      exterior[j] = 1;
      fila.push(j);
    }
  }

  // O que restou transparente e não é fundo: furo interno. Agrupa por
  // vizinhança para separar um olho do outro.
  const visto = new Uint8Array(width * height);
  const buracos = [];

  for (let i = 0; i < width * height; i++) {
    if (visto[i] || exterior[i] || alphaEm(i) >= VAZIO) continue;

    let x0 = width, y0 = height, x1 = 0, y1 = 0, area = 0;
    const pilha = [i];
    visto[i] = 1;

    while (pilha.length) {
      const k = pilha.pop();
      const x = k % width;
      const y = (k - x) / width;

      area++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const j = ny * width + nx;
        if (visto[j] || exterior[j] || alphaEm(j) >= VAZIO) continue;
        visto[j] = 1;
        pilha.push(j);
      }
    }

    // Respingo de anti-aliasing não é olho.
    if (area > 400) buracos.push({ x0, y0, x1, y1, area });
  }

  return { width, height, buracos };
}

const bruto = sharp(SOURCE);
const { buracos } = await acharBuracos(bruto);
console.log(`furos internos encontrados: ${buracos.length}`);
for (const b of buracos) {
  console.log(`  ${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1} em (${b.x0}, ${b.y0}), area ${b.area}`);
}

/**
 * Desenha o olho dentro do furo.
 *
 * A elipse ocupa exatamente a caixa do buraco — ele já TEM formato de olho, é
 * só preencher. Por cima vai o brilho, deslocado para cima e para a esquerda,
 * que é o que separa "olho" de "mancha escura".
 *
 * A tinta é a mesma `--color-ink` do tema: o mascote fica da cor do texto da
 * página em vez de um preto que não existe em lugar nenhum do site.
 */
function olhoSvg({ x0, y0, x1, y1 }) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const rx = w / 2;
  const ry = h / 2;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" fill="rgb(26,18,48)"/>` +
      `<ellipse cx="${rx * 0.66}" cy="${ry * 0.6}" rx="${rx * 0.26}" ry="${ry * 0.22}" ` +
      `fill="rgb(255,255,255)" opacity="0.92"/>` +
      `<circle cx="${rx * 1.32}" cy="${ry * 1.3}" r="${rx * 0.1}" ` +
      `fill="rgb(255,255,255)" opacity="0.5"/>` +
    `</svg>`,
  );
}

const comOlhos = sharp(SOURCE).composite(
  buracos.map((b) => ({ input: olhoSvg(b), left: b.x0, top: b.y0 })),
);

const base = sharp(await comOlhos.png().toBuffer()).trim();
const meta = await base.clone().metadata();
console.log(`origem: ${meta.width}x${meta.height}, aparado`);

const LARGURAS = [
  { w: 420, nome: "nimbo" },
  { w: 240, nome: "nimbo-240" },
];

const kb = (arquivo) => Math.round(statSync(arquivo).size / 1024);

for (const { w, nome } of LARGURAS) {
  const redimensionado = base.clone().resize({ width: w, withoutEnlargement: true });

  await redimensionado.clone().avif({ quality: 62, effort: 6 }).toFile(`public/${nome}.avif`);
  await redimensionado.clone().webp({ quality: 78 }).toFile(`public/${nome}.webp`);

  console.log(
    `  ${nome}: avif ${kb(`public/${nome}.avif`)}KB · webp ${kb(`public/${nome}.webp`)}KB`,
  );
}

/* A prova: como ele fica sobre o rosa, com as transparências resolvidas. */
await base
  .clone()
  .resize({ width: 420 })
  .flatten({ background: BG })
  .png()
  .toFile("assets/nimbo-prova.png");

console.log("prova sobre o fundo rosa: assets/nimbo-prova.png");
