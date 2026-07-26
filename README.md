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

**Fase 0 — Fundação: concluída e verificada.** Next.js 15 + TS strict + Tailwind v4,
tokens da Câmara Escura em `src/styles/theme.css`, três fontes via `next/font`,
Prisma com o schema da seção 7.1, migration inicial e seed, Sentry + PostHog atrás
de env, CI com lint, typecheck, teste, build, orçamento de bundle e analyzer.

Aceite verificado: `pnpm build`, `lint`, `typecheck`, `format:check` e `test`
(8 testes) passam; a página sobe em `localhost:3000` com os tokens aplicados.

`src/app/page.tsx` é um placeholder que só prova que os tokens estão aplicados. A
landing de verdade é a Fase 2.

### Orçamento de JS hoje

| Rota              | Atual         | Limite (SPEC 10) |
| ----------------- | ------------- | ---------------- |
| `/` (placeholder) | 101,3 KB gzip | 220 KB           |

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

Próxima: **Fase 1 — camada de motion e primitivos** (seção 13 do SPEC). Antes de
começar, preencher `docs/MOTION-REFS.md` (seção 6.5) — sem isso a Fase 1 improvisa
os efeitos.

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
