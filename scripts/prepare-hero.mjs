/**
 * Prepara o hero a partir de `assets/hero.png`.
 *
 * O original é um pôr do sol de banco de imagens: 1718x915, 1,72 MB em PNG,
 * luminância média 107/255 e saturação 0,59. Cru, ele é um cartão-postal
 * genérico colado por cima da página, e sozinho já estoura o limite de 250 KB
 * por imagem da seção 10 do SPEC.
 *
 * A ideia da gradação: **a foto mal revelada**. Na pele clara o fundo é creme,
 * então a foto não é rebaixada ao escuro — ela é lavada *para dentro* do creme,
 * como um print que ainda está aparecendo na bandeja do revelador. Fica textura,
 * não imagem: quente, de baixo contraste, com o disco solar sobrando como único
 * ponto denso. É o que deixa um texto quase-preto passar por cima com folga.
 *
 * O que este script faz:
 *  1. corta a moldura — o wide perde a faixa de baixo, onde os braços não
 *     resolvem a 100%; o portrait fecha nos dois de perto, para mobile;
 *  2. lava a imagem para o creme e segura a brasa do sol;
 *  3. sangra as bordas para `--color-bg`, para a foto terminar na cor do fundo
 *     em vez de num corte reto;
 *  4. joga grão de filme por cima — que é da marca e, de quebra, disfarça a
 *     resolução curta do original;
 *  5. exporta AVIF + WebP em duas larguras, e o placeholder do blur.
 *
 * Roda sob demanda, não no build: `node scripts/prepare-hero.mjs`
 * Para conferir a gradação a olho: `PROOF=1 node scripts/prepare-hero.mjs`
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const SHARP_GLOB = "node_modules/.pnpm";
const sharpDir = readdirSync(SHARP_GLOB).find((d) => d.startsWith("sharp@"));
if (!sharpDir) {
  console.error("✗ sharp não encontrado no store do pnpm.");
  process.exit(1);
}
const { default: sharp } = await import(
  `file://${process.cwd()}/${SHARP_GLOB}/${sharpDir}/node_modules/sharp/lib/index.js`
);

const SOURCE = "assets/hero.png";
if (!existsSync(SOURCE)) {
  console.error(`✗ ${SOURCE} não encontrado.`);
  process.exit(1);
}

/* Tokens da pele clara — os mesmos do theme.css. */
const CREME = { r: 255, g: 245, b: 248 }; /* --color-bg */
const ROSE = { r: 194, g: 24, b: 91 }; /* --color-rose */
const SAFELIGHT = { r: 242, g: 180, b: 87 }; /* luz de segurança */

const rgb = ({ r, g, b }) => `rgb(${r},${g},${b})`;

/** Camada SVG do tamanho do recorte. */
const layer = (w, h, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`,
  );

/** Chapado de uma cor, com alfa — vai de `multiply` ou `soft-light`. */
const flat = (w, h, color, alpha) =>
  layer(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${rgb(color)}" fill-opacity="${alpha}"/>`,
  );

/** Brasa do sol: o disco solar é o único ponto denso que sobra. */
const ember = (w, h, cx, cy, radius) =>
  layer(
    w,
    h,
    `<defs><radialGradient id="e" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${radius}">` +
      `<stop offset="0" stop-color="${rgb(SAFELIGHT)}" stop-opacity=".92"/>` +
      `<stop offset=".24" stop-color="${rgb(SAFELIGHT)}" stop-opacity=".44"/>` +
      `<stop offset=".60" stop-color="${rgb(ROSE)}" stop-opacity=".16"/>` +
      `<stop offset="1" stop-color="#000000" stop-opacity="0"/>` +
      `</radialGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#e)"/>`,
  );

/**
 * Halação: o inverso da vinheta.
 *
 * Vinheta queima as bordas, o que faz sentido sobre o noir. Sobre creme, borda
 * queimada vira mancha suja — o que a página pede é o contrário, as bordas
 * **estourando** para o branco do papel. Entra em `screen`, que só clareia.
 */
const halation = (w, h, força = 1) =>
  layer(
    w,
    h,
    `<defs><radialGradient id="v" cx="46%" cy="44%" r="74%">` +
      `<stop offset="0" stop-color="#000000" stop-opacity="0"/>` +
      `<stop offset=".52" stop-color="${rgb(CREME)}" stop-opacity="${0.1 * força}"/>` +
      `<stop offset=".80" stop-color="${rgb(CREME)}" stop-opacity="${0.42 * força}"/>` +
      `<stop offset="1" stop-color="${rgb(CREME)}" stop-opacity="${0.72 * força}"/>` +
      `</radialGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#v)"/>`,
  );

/**
 * Sangria: a foto termina na cor do fundo, não num corte reto.
 *
 * Embaixo é a queda mais longa — é onde o texto vai por cima e onde os braços
 * não fecham. À esquerda a queda é forte porque é a coluna da copy.
 */
const bleed = (w, h) =>
  layer(
    w,
    h,
    `<defs>` +
      `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${rgb(CREME)}" stop-opacity=".62"/>` +
      `<stop offset=".34" stop-color="${rgb(CREME)}" stop-opacity=".10"/>` +
      `<stop offset=".66" stop-color="${rgb(CREME)}" stop-opacity=".26"/>` +
      `<stop offset=".88" stop-color="${rgb(CREME)}" stop-opacity=".80"/>` +
      `<stop offset="1" stop-color="${rgb(CREME)}" stop-opacity=".97"/>` +
      `</linearGradient>` +
      `<linearGradient id="s" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${rgb(CREME)}" stop-opacity=".78"/>` +
      `<stop offset=".22" stop-color="${rgb(CREME)}" stop-opacity=".12"/>` +
      `<stop offset=".84" stop-color="${rgb(CREME)}" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="${rgb(CREME)}" stop-opacity=".55"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect width="${w}" height="${h}" fill="url(#b)"/>` +
      `<rect width="${w}" height="${h}" fill="url(#s)"/>`,
  );

/** Grão de filme. Ruído gaussiano dessaturado, jogado em soft-light. */
function grain(w, h) {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 12 },
    },
  })
    .grayscale()
    .png()
    .toBuffer();
}

/**
 * A gradação. Levanta e lava primeiro, depois as camadas — brasa antes da
 * halação, sangria antes do grão.
 *
 * **São dois trabalhos, não um.** A distinção não é de gosto, é de função:
 *
 * `fundo` é a foto que vive ATRÁS do texto do hero. Ela precisa sumir: o
 * `linear(0.72, 58)` comprime a faixa tonal e levanta o preto para 58, então
 * nada nela chega perto da tinta quase-preta que passa por cima. A sangria
 * termina a imagem na cor do fundo em vez de num corte reto. É textura.
 *
 * `foto` é a foto que vive DENTRO do celular, e ali ela é o assunto — é a
 * prova do produto, a coisa que a pessoa está tentando decidir se compra.
 * Aplicada a gradação de fundo, ela saía fantasma: a sangria sozinha lavava a
 * metade de baixo até 97% de creme e apagava o casal. Aqui a lavagem some, a
 * halação entra a um terço e a sangria não entra. Sobra o mesmo tratamento de
 * cor — brasa, rosa, grão — para ela continuar sendo da mesma família visual.
 */
async function develop({ crop, sun, grade = "fundo" }) {
  const { width: w, height: h } = crop;
  const éFundo = grade === "fundo";

  const base = await sharp(SOURCE)
    .extract(crop)
    .modulate(
      éFundo
        ? { saturation: 0.55, brightness: 1.18 }
        : { saturation: 0.94, brightness: 1.03 },
    )
    // Sem o levantamento de preto na foto: é ele que tira a densidade do
    // casal, e aqui não há texto por cima para proteger.
    .linear(...(éFundo ? [0.72, 58] : [1, 0]))
    .toBuffer();

  const camadas = [
    { input: flat(w, h, CREME, éFundo ? 0.42 : 0.08), blend: "screen" },
    { input: flat(w, h, ROSE, éFundo ? 0.2 : 0.14), blend: "soft-light" },
    { input: ember(w, h, sun.x, sun.y, sun.r), blend: "screen" },
    { input: halation(w, h, éFundo ? 1 : 0.34), blend: "screen" },
  ];

  if (éFundo) camadas.push({ input: bleed(w, h), blend: "over" });

  camadas.push({ input: await grain(w, h), blend: "soft-light" });

  return sharp(base).composite(camadas).toBuffer();
}

/*
 * Recortes.
 *
 * wide: perde os 135 px de baixo — é a faixa dos braços que não resolvem, e o
 * 2,2:1 que sobra é mais cinema e menos cartão-postal.
 * portrait: fecha nos dois, 4:5, para os 90% de tráfego mobile da seção 1.
 */
const VARIANTS = [
  {
    name: "hero-wide",
    crop: { left: 0, top: 0, width: 1718, height: 780 },
    sun: { x: 1180, y: 432, r: 470 },
    widths: [1718, 859],
  },
  /*
   * O fundo da dobra no desktop: **só céu**.
   *
   * O casal vive dentro do mockup, ao lado. Reaproveitar o recorte largo aqui
   * fazia as mesmas duas pessoas aparecerem duas vezes lado a lado, em escalas
   * diferentes. Recortar à direita de x=1000 garante isso na fonte, em vez de
   * depender de `object-position` acertar o enquadramento em toda tela.
   */
  {
    name: "hero-sky",
    crop: { left: 1000, top: 0, width: 718, height: 780 },
    sun: { x: 180, y: 432, r: 420 },
    widths: [718, 480],
  },
  {
    name: "hero-portrait",
    crop: { left: 340, top: 20, width: 720, height: 895 },
    sun: { x: 840, y: 412, r: 430 },
    widths: [720, 480],
  },
  /*
   * A foto de dentro do mockup.
   *
   * Ela existe porque o retângulo vazio ali era o maior elemento da dobra — um
   * buraco no meio do argumento de venda. Recorte quadrado, fechado nos dois,
   * porque é o que uma pessoa de verdade colocaria como capa.
   */
  {
    name: "hero-mockup",
    crop: { left: 380, top: 120, width: 640, height: 640 },
    sun: { x: 800, y: 312, r: 380 },
    widths: [560, 320],
    // Esta é a única que aparece como imagem, não como fundo.
    grade: "foto",
  },
];

const report = [];

for (const variant of VARIANTS) {
  const developed = await develop(variant);
  const { height: fullHeight, width: fullWidth } = variant.crop;

  for (const width of variant.widths) {
    const height = Math.round((fullHeight * width) / fullWidth);
    const resized = await sharp(developed)
      .resize(width, height, { fit: "cover" })
      .toBuffer();

    const suffix = width === variant.widths[0] ? "" : `-${width}`;

    for (const [format, options] of [
      ["avif", { quality: 52, effort: 6 }],
      ["webp", { quality: 74, effort: 6 }],
    ]) {
      const file = `public/${variant.name}${suffix}.${format}`;
      const out = await sharp(resized)[format](options).toBuffer();
      writeFileSync(file, out);
      report.push({ file, width, height, kb: out.length / 1024 });
    }
  }

  // Contato de prova, para conferir a gradação a olho: `PROOF=1 node …`.
  // Vai para .drafts/ porque public/ é servido — prova não se publica.
  if (process.env.PROOF) {
    mkdirSync(".drafts", { recursive: true });
    await sharp(developed).png().toFile(`.drafts/proof-${variant.name}.png`);
  }

  const tiny = await sharp(developed).resize(16).webp({ quality: 28 }).toBuffer();
  console.log(
    `\n${variant.name} blurDataURL (${tiny.length} B):\ndata:image/webp;base64,${tiny.toString("base64")}`,
  );
}

console.log("");
for (const { file, width, height, kb } of report) {
  const flag = kb > 250 ? "✗" : "✓";
  console.log(
    `${flag} ${file.padEnd(34)} ${String(width).padStart(4)}x${String(height).padEnd(4)}  ${kb.toFixed(0).padStart(3)} KB`,
  );
}
