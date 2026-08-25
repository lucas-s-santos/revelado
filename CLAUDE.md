# Revelado — contexto do projeto

SaaS brasileiro de **páginas de casal** com QR Code. A pessoa monta a página do
casal dela (fotos, carta, música, contador ao vivo desde o primeiro dia), paga
uma vez via Pix e recebe link + QR Code para imprimir e entregar em mãos.

**O produto é um só.** Não há ocasião a escolher: a mesma página serve do
primeiro mês às bodas. O que varia é o template (a moldura) e a paleta (a cor),
nunca o público. Se aparecer um seletor que ramifica conteúdo por data, é sinal
de que o modelo de ocasiões está voltando — e ele foi removido de propósito na
v2 do SPEC.

## Documento de referência

`docs/SPEC.md` é a fonte de verdade. Leia as seções relevantes antes de qualquer
tarefa. Se algo divergir dele, pergunte em vez de improvisar.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Motion
(`motion/react`) · shadcn/ui + Magic UI + Aceternity · Zustand · Zod · Prisma +
Postgres · Cloudflare R2 · Mercado Pago · Inngest · pnpm.

## Regras invioláveis

1. A página é uma lista de blocos em JSON (`lib/blocks/schema.ts`). Nunca colunas
   fixas no banco para conteúdo.
2. Preview e página publicada usam o MESMO `BlockRenderer`. Zero duplicação.
3. Um único listener de `scroll` e um único de `pointermove` na aplicação inteira,
   throttled por rAF, escrevendo CSS custom properties.
4. Server Components por padrão. `"use client"` só na folha da árvore.
5. Nenhuma cor hardcoded. Tudo vem dos tokens em `styles/theme.css`.
6. `--color-accent` é dinâmico e muda conforme a **paleta** que a pessoa
   escolhe (`lib/palettes.ts`), nunca conforme uma data. `data-palette` vai no
   contêiner da página, nunca no `documentElement`.
7. Nunca publicar página sem webhook de pagamento confirmado.
8. Nunca exigir login antes do editor — nem colocar tela nenhuma antes dele.
9. Nunca processar imagem no request — vai para a fila.
10. Nunca hospedar arquivo de música (só embed oficial).
11. Motion ambiental é proibido no painel e no admin.
12. Valores monetários em centavos, inteiros.
13. Toda entrada validada com zod no cliente e no servidor.
14. `prefers-reduced-motion` desliga tudo.
15. Contraste se **mede**, não se estima. Cor nova passa pelo cálculo WCAG
    antes de entrar — e texto que fica por cima de foto precisa de folga sobre
    os 4.5:1, não do valor no limite.
16. Nenhum dado de cartão passa pelo nosso servidor. Cartão é Checkout Pro.

## Identidade visual

**Duas peles.** O padrão é a **clara**: fundo rosado (`#FFF5F8`), tinta
arroxeada quase-preta (`#1A1230`), rosa de marca. Landing, editor e checkout
são sempre ela. A **escura** é a "Câmara Escura" original — preto arroxeado de
laboratório, luz de segurança âmbar, magenta de ampliação — e hoje é escolha de
quem monta a página (`theme.skin`), não o padrão do site.

**Dois rosas, e é de propósito.** `--color-brand` (`#E01B7A`) é o rosa que
**preenche** — botão, selo, cartão do CTA — e ainda carrega texto branco a
4,56:1. `--color-accent` é o rosa que **escreve**, escurecido até passar sobre
o fundo claro. `--color-brand-bright` (`#FF2E93`) existe só para brilho e
gradiente: branco sobre ele dá 3,48:1 e **nunca** pode ficar atrás de texto.

Os tokens de superfície dizem o papel, nunca a cor: `--color-bg`,
`--color-surface`, `--color-surface-2`, `--color-ink`, `--color-ink-muted`.
Nenhuma regra de CSS deve saber de que cor é a pele. O mesmo vale para o vidro
(`--glass-*`), a sombra e a vinheta.
Tipografia: Instrument Serif (display, com parcimônia) + Inter (corpo) +
JetBrains Mono (contadores e labels, sempre com tabular-nums).

**Camada vence especificidade.** `.eyebrow` e `.display-italic` moram em
`@layer utilities`; o CSS das seções mora em `@layer components`, que o
Tailwind emite antes. Variante dessas duas classes escrita junto da seção é
emitida, aparece no CSS servido e **não se aplica** — sem erro nenhum. Toda
variante delas entra no bloco de `utilities`, depois da classe que modifica.

**Mascote.** `nimbo-3d.png` é a origem; o que vai para tela são os arquivos
gerados por `scripts/prepare-nimbo.mjs` (`public/nimbo*`). O PNG original vem
com as órbitas dos olhos transparentes — sobre a pele clara elas viram buraco.
Trocou a origem, roda o script de novo.

Não empilhar efeitos: máximo dois efeitos ambientais por tela. Se a tela começar a
parecer landing genérica de startup de IA, remova um efeito.

## Comandos

pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test · pnpm test:e2e
pnpm db:migrate · pnpm db:seed · pnpm db:studio

## Ao terminar qualquer tarefa

Rodar build, lint e typecheck. Revisar contra os anti-padrões da seção 12 do SPEC.
Não commitar com o orçamento de performance da seção 10 estourado.
