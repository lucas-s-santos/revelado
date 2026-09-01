/**
 * Orçamento de performance — SPEC seção 10.
 * Soma o JS gzipado de cada rota a partir do app-build-manifest e falha se
 * estourar o limite. Roda no CI depois do build: "PR que estourar o orçamento
 * não passa".
 *
 * Uso: node scripts/check-budget.mjs
 */
import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const KB = 1024;

/** entry do app-build-manifest → limite em KB de JS gzipado */
const BUDGETS = [
  { route: "/page", label: "landing", limitKB: 220 },
  { route: "/p/[slug]/page", label: "página publicada", limitKB: 120 },
  { route: "/editor/[draftId]/page", label: "editor", limitKB: 300 },
];

/* O mesmo diretorio que o next.config resolve. Sem isto, uma verificacao
 * rodando em `.next-verify` mediria o `.next` do servidor de desenvolvimento
 * ao lado -- que e uma build de dev, sem minificacao e com outros nomes de
 * chunk. Foi assim que este script chegou a reportar 27,5 KB para a landing e
 * a sumir com duas das tres rotas. */
const DIST = process.env.NEXT_DIST_DIR ?? ".next";

const manifestPath = join(process.cwd(), DIST, "app-build-manifest.json");

if (!existsSync(manifestPath)) {
  console.error(
    `✗ ${DIST}/app-build-manifest.json não encontrado. Rode pnpm build antes.`,
  );
  process.exit(1);
}

/** @type {{ pages: Record<string, string[]> }} */
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const gzipCache = new Map();

function gzipKB(file) {
  if (gzipCache.has(file)) return gzipCache.get(file);
  const path = join(process.cwd(), DIST, file);
  if (!existsSync(path) || !statSync(path).isFile()) {
    gzipCache.set(file, 0);
    return 0;
  }
  const size = gzipSync(readFileSync(path)).length / KB;
  gzipCache.set(file, size);
  return size;
}

let failed = false;
let checked = 0;

for (const { route, label, limitKB } of BUDGETS) {
  const files = manifest.pages[route];
  if (!files) continue; // rota ainda não existe (fases seguintes)

  checked += 1;
  const js = [...new Set(files)].filter((file) => file.endsWith(".js"));
  const totalKB = js.reduce((sum, file) => sum + gzipKB(file), 0);
  const over = totalKB > limitKB;
  failed ||= over;

  console.log(
    `${over ? "✗" : "✓"} ${label.padEnd(18)} ${totalKB.toFixed(1).padStart(7)} KB gzip  (limite ${limitKB} KB)`,
  );

  if (over) {
    const heaviest = js
      .map((file) => ({ file, kb: gzipKB(file) }))
      .sort((a, b) => b.kb - a.kb)
      .slice(0, 5);
    for (const { file, kb } of heaviest) {
      console.log(`    ${kb.toFixed(1).padStart(7)} KB  ${file}`);
    }
  }
}

if (checked === 0) {
  console.log("· nenhuma rota do orçamento existe ainda — nada a verificar");
}

if (failed) {
  console.error("\n✗ Orçamento da seção 10 do SPEC estourado.");
  process.exit(1);
}
