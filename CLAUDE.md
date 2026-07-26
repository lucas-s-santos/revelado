# Revelado — contexto do projeto

SaaS brasileiro de páginas comemorativas com QR Code. A pessoa monta uma página
(fotos, mensagem, música, contador ao vivo), paga uma vez via Pix e recebe link +
QR Code para imprimir e presentear.

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
6. `--color-accent` é dinâmico e muda conforme a ocasião.
7. Nunca publicar página sem webhook de pagamento confirmado.
8. Nunca exigir login antes do editor.
9. Nunca processar imagem no request — vai para a fila.
10. Nunca hospedar arquivo de música (só embed oficial).
11. Motion ambiental é proibido no painel e no admin.
12. Valores monetários em centavos, inteiros.
13. Toda entrada validada com zod no cliente e no servidor.
14. `prefers-reduced-motion` desliga tudo.

## Identidade visual

Conceito "Câmara Escura": preto arroxeado de laboratório fotográfico, luz de
segurança âmbar, magenta de filtro de ampliação, ciano só para estados vivos.
Tipografia: Instrument Serif (display, com parcimônia) + Inter (corpo) +
JetBrains Mono (contadores e labels, sempre com tabular-nums).

Não empilhar efeitos: máximo dois efeitos ambientais por tela. Se a tela começar a
parecer landing genérica de startup de IA, remova um efeito.

## Comandos

pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test · pnpm test:e2e
pnpm db:migrate · pnpm db:seed · pnpm db:studio

## Ao terminar qualquer tarefa

Rodar build, lint e typecheck. Revisar contra os anti-padrões da seção 12 do SPEC.
Não commitar com o orçamento de performance da seção 10 estourado.
