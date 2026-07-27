# Revelado

SaaS de páginas comemorativas com QR Code. A pessoa escolhe uma ocasião, monta a
página (fotos, mensagem, música, contador ao vivo), paga uma vez via Pix e recebe
link + QR Code para imprimir e presentear.

`docs/SPEC.md` é a fonte de verdade do projeto. `CLAUDE.md` é o resumo que o
Claude Code lê a cada sessão.

## Começando

```bash
pnpm install
cp .env.example .env.local   # preencha DATABASE_URL (Neon)
pnpm db:generate
pnpm db:migrate              # precisa de DATABASE_URL válido
pnpm db:seed                 # ocasiões, templates e planos
pnpm dev
```

Sem `DATABASE_URL` o `pnpm dev` e o `pnpm build` funcionam — nenhuma tela da Fase 0
consulta o banco. Sentry e PostHog ficam inertes sem as chaves.

## Comandos

| Comando                                                     | O que faz                                              |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                                  | Dev server                                             |
| `pnpm build`                                                | Build de produção                                      |
| `pnpm lint`                                                 | ESLint (inclui as regras dos anti-padrões da seção 12) |
| `pnpm typecheck`                                            | `tsc --noEmit`                                         |
| `pnpm format` / `pnpm format:check`                         | Prettier                                               |
| `pnpm test`                                                 | Vitest (unit)                                          |
| `pnpm test:e2e`                                             | Playwright (funil)                                     |
| `pnpm analyze`                                              | Build com bundle analyzer em `.next/analyze`           |
| `pnpm budget`                                               | Verifica o orçamento de JS da seção 10 do SPEC         |
| `pnpm db:generate` · `db:migrate` · `db:seed` · `db:studio` | Prisma                                                 |

## Estado atual

**Fase 3 — Motor de blocos: concluída e verificada.** A página é uma lista
ordenada de blocos em JSON ([`lib/blocks/schema.ts`](src/lib/blocks/schema.ts)),
e o **mesmo** [`BlockRenderer`](src/components/blocks/block-renderer.tsx) desenha
o preview do editor e a página publicada. Prova visual em **`/dev/blocos`**,
prova automatizada em `block-renderer.test.tsx`, que renderiza os dois modos e
compara o HTML — se alguém duplicar o renderer, o teste quebra.

Sete blocos prontos (capa, contador, carta, galeria, música, linha do tempo,
rodapé) e seis já no schema esperando a Fase 7. Página publicada de exemplo:
[`/p/exemplo-namorados`](src/lib/blocks/fixtures.ts).

Truque que sustenta tudo: os blocos apresentacionais **não** têm `"use client"`.
Assim rodam como Server Component em `/p/[slug]` — zero JavaScript — e são
compilados como client quando o editor importa o mesmo módulo. Só contador e
música, que precisam mesmo de interação, viram JS no cliente.

**Fase 2 — Landing completa: concluída e verificada.** As 12 seções da 8.1, de
`/` ao rodapé, responsivas até 360px. Textos todos em
[`lib/copy.ts`](src/lib/copy.ts) (SPEC 12), evento `landing_view` no PostHog.

A contagem regressiva é **real**: [`lib/promo.ts`](src/lib/promo.ts) calcula a
próxima comemoração de verdade (datas móveis incluídas — 2º domingo de maio e de
agosto) e a barra diz qual é. Nada de contador que reinicia sozinho para fabricar
urgência. Cinco testes cobrem as datas, porque errar ali é errar em público.

O preço da vitrine e o do checkout saem da mesma `orderTotalCents`, para nunca
divergirem quando a Fase 5 chegar.

**Fase 1 — Camada de motion: concluída e verificada.** Sete hooks, sete
componentes próprios e os componentes de biblioteca instalados e retematizados.
Demonstração viva em **`/dev/motion`** (não indexada).

Regra central da fase, da seção 6.4 do SPEC: **um** listener de `scroll` e **um**
de `pointermove` na aplicação inteira, throttled por rAF, escrevendo CSS custom
properties. Quem precisa da posição assina os drivers em
[`use-scroll-driver`](src/hooks/use-scroll-driver.ts) e
[`use-pointer`](src/hooks/use-pointer.ts) — os dois únicos arquivos onde o ESLint
permite registrar esses eventos. Três testes em
[`use-scroll-driver.test.ts`](src/hooks/use-scroll-driver.test.ts) travam a
invariante: 3 assinantes, 1 listener.

Efeitos que resolvem em CSS puro, com zero JavaScript por frame: safelight,
barra de progresso, trilho dos três atos e a "revelação" (fotos saindo de
`saturate(.06) blur(5px)` para nítidas conforme o scroll).

**Fase 0 — Fundação: concluída e verificada.** Next.js 15 + TS strict + Tailwind v4,
tokens da Câmara Escura em `src/styles/theme.css`, três fontes via `next/font`,
Prisma com o schema da seção 7.1, migration inicial e seed, Sentry + PostHog atrás
de env, CI com lint, typecheck, teste, build, orçamento de bundle e analyzer.

Aceite verificado: `pnpm build`, `lint`, `typecheck`, `format:check` e `test`
(8 testes) passam; a página sobe em `localhost:3000` com os tokens aplicados.

`src/app/page.tsx` é um placeholder que só prova que os tokens estão aplicados. A
landing de verdade é a Fase 2.

### Orçamento de JS hoje

| Rota                    | Atual         | Limite (SPEC 10)  |
| ----------------------- | ------------- | ----------------- |
| `/` (landing completa)  | 176,4 KB gzip | 220 KB            |
| `/p/[slug]` (publicada) | 115,3 KB gzip | 120 KB            |
| `/dev/*` (só em dev)    | ~172 KB       | fora do orçamento |

A página publicada é o caso apertado: só o piso de React + Next já são 98,7 KB
dos 120 permitidos, sobrando ~16 KB para o produto inteiro. Três decisões
compram esse espaço, todas anotadas no código:

- **`Reveal` em CSS**, não no Motion — o efeito é só `opacity` e `translateY`,
  e o Motion custaria ~40 KB;
- **`Frame` com `<img>` + `srcSet`**, não `next/image`, cujo runtime custa
  13,7 KB. As variantes AVIF/WebP vêm do R2 pela fila `media.process`, não do
  otimizador do Next — então quase nada se perdeu;
- **`lib/units.ts` separado do `lib/copy.ts`**: o contador precisa só dos
  rótulos de tempo, e importar de `copy` arrastava preços, FAQ e depoimentos
  para o bundle da página publicada. Chunk é granular por módulo, não por
  export — tree-shaking sozinho não resolvia.

Na landing, o FAQ usa `<details>` nativo em vez do acordeão do Radix: semântica
e teclado já vêm do navegador, e não custa JavaScript nenhum.

O SDK do Sentry no browser sozinho custava 127 KB gzip — mais do que o orçamento
inteiro da página publicada. Por isso ele entra por **import dinâmico** em
`instrumentation-client.ts` e em `global-error.tsx`, e só é baixado quando há
`NEXT_PUBLIC_SENTRY_DSN`. Custo aceito: erro nos primeiros milissegundos, antes do
chunk chegar, não é capturado.

### O que falta para o banco funcionar

A migration `prisma/migrations/0_init` foi gerada offline (`prisma migrate diff`),
mas nunca foi aplicada — não há Neon configurado. Com o `DATABASE_URL` em mãos:

```bash
pnpm exec prisma migrate resolve --applied 0_init   # se o banco já existir
pnpm db:migrate                                     # ou aplica do zero
pnpm db:seed
```

### A logo

`public/logo.png` é o original entregue (800×800, 803 KB, fundo branco opaco).
`scripts/prepare-logo.mjs` gera dele `logo-mark.png`, `logo-mark-128.png` e
`src/app/icon.png`, recortando o fundo por flood fill a partir das bordas — o
original, sozinho, estouraria o limite de 250 KB por imagem e apareceria como um
adesivo branco sobre o noir.

Duas ressalvas: a paleta da logo (petróleo, creme, coral) é outro sistema visual
que a Câmara Escura (âmbar e magenta sobre noir), então ela não acompanha o accent
da ocasião como o resto da interface; e a ilustração é detalhada demais para os
34px da nav, onde perde definição. Uma versão vetorial ou monocromática entra em
[`components/chrome/logo.tsx`](src/components/chrome/logo.tsx), que é o único
arquivo que referencia o asset.

### Pendências deixadas para as fases certas

- **Fotos de exemplo.** O `/p/exemplo-namorados` mostra molduras vazias: não há
  imagem nenhuma em `public/`. Basta colocar quatro fotos e apontar os `mediaId`
  do fixture para elas.
- **Da Fase 6, na página publicada**: senha, `opengraph-image`, contagem de
  visita agregada e revalidação por tag ao editar. Expirada já tem tratamento
  (mostra CTA de renovação, nunca 404).
- **Divergência do SPEC 7.2, consciente**: `gallery.mediaIds` não tem `.min(1)`.
  Rascunho nasce sem foto, e com `.min(1)` no schema todo autosave falharia — o
  que quebra o requisito mais importante do editor (SPEC 8.4). A exigência de ter
  foto mudou de lugar, não sumiu: vale na publicação, em `validateForPublish`.

Próxima: **Fase 4 — editor** (SPEC 8.4). A tela mais difícil do produto, com um
requisito acima de todos: nunca perder o trabalho de quem está montando.

`docs/MOTION-REFS.md` continua vazio — as Fases 1 e 2 seguiram a seção 6.3 do SPEC
ao pé da letra, sem referência visual externa.

## Regras que valem para todo commit

Resumo do que está detalhado na seção 12 do SPEC:

1. A página é uma lista de blocos em JSON. Nunca colunas fixas para conteúdo.
2. Preview e página publicada usam o mesmo `BlockRenderer`.
3. Um único listener de `scroll` e um de `pointermove` na aplicação inteira — o
   ESLint reprova o resto.
4. Server Components por padrão. `"use client"` só na folha.
5. Nenhuma cor hardcoded: tudo vem de `theme.css`.
6. Valores monetários em centavos, inteiros.
7. `prefers-reduced-motion` desliga tudo.
