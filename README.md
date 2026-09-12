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

**Fase 6 — Página publicada em produção: concluída, com um aceite ainda por
medir.** A página publicada deixou de ser só um renderer bonito e virou um
produto entregue.

O que a fase fechou:

- **Senha de verdade.** O commit anterior tinha a tela `/p/[slug]/senha` e o
  `lib/site-password.ts`, mas ninguém chamava: a página protegida abria direto
  para quem tivesse o link. Agora o gate está em `/p/[slug]`, e o cookie de
  destravamento é derivado do hash — trocar a senha expulsa os cookies antigos
  sem precisar de lista de revogação. Sete testes cobrem isso.
- **O ISR sobreviveu ao gate.** O `cookies()` só é lido quando a página **tem**
  senha, então página protegida sai do cache de rota (o correto: a resposta
  depende de quem pede) e todas as outras continuam estáticas. O build confirma:
  `/p/[slug]` ainda aparece como `●` SSG.
- **Contagem de visitas** agregada por dia, disparada por `sendBeacon` depois do
  paint — nunca no render, que custaria uma ida ao banco por abertura e mataria
  o cache da tela mais importante do sistema. A primeira visita dispara o e-mail
  "sua página foi aberta", que o SPEC 8.7 chama de maior gatilho emocional do
  produto.
- **`opengraph-image`** por página, na Câmara Escura, com o accent da ocasião. É
  a primeira coisa que a pessoa presenteada vê no WhatsApp, antes de tocar no
  link. Página com senha não entrega título nem foto na prévia — adiantar os
  nomes no card desfaria a senha pela metade.
- **Revalidação por tag** ao publicar e ao mexer na privacidade. Sem ela, quem
  abrisse o link antes de o pagamento confirmar continuaria vendo "página não
  encontrada" pela hora inteira do ISR — justamente no dia da entrega.
- **`/painel/[siteId]`**: visitas, validade, senha, indexação e QR num lugar só.
  Sóbrio, sem nenhum efeito ambiental (regra inviolável 11).

**O que falta medir:** LCP < 1,5s em 4G real e o card do WhatsApp renderizando
num aparelho — os dois aceites da fase que nenhum teste automatizado faz. O card
já foi conferido em runtime (o Satori gera o PNG), mas não colado numa conversa.
A foto só entra no card quando `NEXT_PUBLIC_R2_PUBLIC_HOST` estiver configurado:
o Satori busca a imagem por URL absoluta e não enxerga o caminho local.

**Fase 5 — Checkout e publicação: concluída e verificada.** O funil fecha:
`/criar` → `/editor` → `/checkout` → Pix → webhook → página no ar → QR para
imprimir. Testado de ponta a ponta no Chrome, com foto real e cupom aplicado.

A regra que organiza a fase inteira: **o webhook é a única fonte de verdade do
pagamento** (anti-padrão 6). Nenhum caminho do código publica página sem passar
por uma transição para `PAID`, e a transição é idempotente — o Mercado Pago
reenvia notificação, e reenviar não pode publicar duas vezes nem mandar dois
e-mails. Onze testes cobrem isso, incluindo os quatro estados que o aceite pede
(pago, pendente, expirado, reembolsado), a notificação fora de ordem e o
"pagamento que confirma 2 dias depois publica normalmente".

QR Code em nível de correção **H**, com PNG 2048px, SVG vetorial e cartão A6 em
PDF. O teste decodifica o PNG gerado de volta com um leitor de verdade (`jsqr`) —
inclusive com 22% da área apagada, simulando dobra e borrão de impressão.
**O teste físico continua sendo seu**: imprimir em papel comum e escanear em três
aparelhos é a parte do aceite que nenhum teste automatizado faz.

Sem `MERCADOPAGO_ACCESS_TOKEN`, o checkout usa um **simulador** que dispara o
webhook de verdade com o mesmo corpo que o Mercado Pago mandaria — é o que
permite exercitar os quatro estados sem conta no provedor. Sem `RESEND_API_KEY`,
os e-mails saem no log do servidor.

**Fase 4 — Editor: concluída e verificada.** `/criar` → `/editor/[draftId]`, modo
simples em cinco passos (Quem · Quando · Fotos · Mensagem · Estilo), preview ao
vivo, autosave, undo/redo e upload de fotos com progresso e retry.

O aceite da fase foi conferido no navegador de verdade, não presumido: montei uma
página, **fechei a aba**, voltei pela mesma URL e o título e a mensagem estavam
lá. O que sustenta isso:

- **o servidor é a fonte de verdade** (anti-padrão 10) — o editor hidrata do
  servidor, não do `localStorage`;
- autosave com debounce de 800ms e **retry com espera crescente**: 4G cai, e cair
  não pode significar perder;
- **`sendBeacon` no `pagehide`**, para o último trecho digitado ir junto quando a
  aba fecha;
- `sessionStorage` como rede de segurança, nunca como fonte.

Sem `DATABASE_URL` e sem chaves do R2, o projeto roda inteiro em modo local:
rascunhos viram JSON em `.drafts/` e as fotos vão para `.drafts/media/`. Os dois
sobrevivem a reiniciar o servidor — é o que torna o aceite testável hoje. Nada
disso liga na Vercel (ver `LOCAL_MEDIA_ENABLED` em
[`lib/r2.ts`](src/lib/r2.ts)), onde o disco é efêmero e gravar nele significaria
perder as fotos no próximo deploy.

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
| `/` (landing completa)  | 176,7 KB gzip | 220 KB            |
| `/p/[slug]` (publicada) | 115,4 KB gzip | 120 KB            |
| `/editor/[draftId]`     | 172,2 KB gzip | 300 KB            |
| `/checkout/[draftId]`   | 174 KB        | 300 KB            |
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
- **Tipografia do `opengraph-image`.** O card sai na fonte padrão do Satori, não
  em Instrument Serif: `next/font` entrega a fonte ao navegador, não um arquivo
  que o gerador de imagem consiga ler. Para usar a fonte da marca é preciso um
  `.ttf` em `public/` e passar os bytes em `fonts` para o `ImageResponse`.
- **Divergência do SPEC 7.2, consciente**: `gallery.mediaIds` não tem `.min(1)`.
  Rascunho nasce sem foto, e com `.min(1)` no schema todo autosave falharia — o
  que quebra o requisito mais importante do editor (SPEC 8.4). A exigência de ter
  foto mudou de lugar, não sumiu: vale na publicação, em `validateForPublish`.

Próxima: **Fase 7 — crescimento** (SPEC 13): blocos V2 (mural, vídeo, mapa,
cápsula, motivos, stats — os seis já estão no schema), mais quatro ocasiões,
estatísticas no painel, SEO programático (`/ocasioes`, `/exemplos`,
`/mensagens`), admin completo, moderação, cupons e afiliados.

### Segurança — o que está travado e o que você precisa configurar

O funil inteiro é aberto: ninguém faz login antes do editor (SPEC 1). Por isso as
travas são todas do lado do servidor e estão em três arquivos.

| Trava                      | Onde                           | O que impede                                                                                                                                                                        |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Teto de requisições por IP | `lib/rate-limit.ts`            | Derrubar o app pelo `/api/qr` (PDF custa segundos de CPU), queimar cobranças no Mercado Pago, encher o banco de rascunhos, força bruta na senha da página                           |
| Dono do rascunho           | `lib/anon.ts` → `isDraftOwner` | Abrir o editor, o checkout, o painel ou o `/sucesso` de outra pessoa. **Uma função só** — quando o login chegar, a regra por `userId` entra aqui e todas as telas ganham de uma vez |
| Link assinado              | `lib/access-token.ts`          | `/sucesso` abre no computador de quem pagou no celular (o link vai no e-mail) sem abrir para quem só adivinhou o id do pedido                                                       |
| Registro de recusa         | `lib/security-log.ts`          | Ataque acontecer em silêncio. Manda para o Sentry com a tag `security`                                                                                                              |
| Cabeçalhos                 | `next.config.ts`               | Clickjacking no checkout, sniffing de tipo, vazamento do slug no `referer`                                                                                                          |

**Duas variáveis são obrigatórias em produção:**

- `MERCADOPAGO_WEBHOOK_SECRET` — sem ela o webhook **recusa** toda notificação
  (`lib/mercadopago.ts`). Antes ele aceitava qualquer POST, o que significava
  publicar página de graça para quem descobrisse a URL.
- `AUTH_SECRET` — assina os links de `/sucesso` e os cookies de senha. Sem ela,
  o app usa um valor de reserva que é público e grita no log.

### Dois defeitos que só o e2e encontrou

Ambos na página publicada — a tela que é o produto entregue — e ambos invisíveis
para os testes unitários e para qualquer conferência manual rápida.

**1. Página com senha devolvia 500 em produção.** `/p/[slug]` declarava
`revalidate = 3600` e `generateStaticParams`, o que faz o Next tratar a rota
como geração estática. Ler cookie ali **não** "cai para dinâmico" como o
comentário do arquivo afirmava — estoura `DYNAMIC_SERVER_USAGE`. Em `pnpm dev`
funcionava, que é o pior tipo de bug.

**2. Página com prazo quebrava a partir do segundo acesso.** A leitura passa por
`unstable_cache`, que **serializa** o que guarda: na volta do cache, `expiresAt`
não era mais `Date`, era a string ISO dele, e `isExpired` chamava `.getTime()`
nela. O primeiro acesso funcionava (valor fresco) e o segundo dava 500. Valia
para todo plano com `durationDays` — ou seja, dois dos três. Travado agora em
`sites.test.ts`, que faz a data passar por `JSON.parse(JSON.stringify(...))`
igual ao cache faz.

### A página publicada deixou de ser estática — e por quê

O e2e do funil encontrou um defeito que nenhum teste unitário pegaria: **toda
página com senha devolvia 500 em produção**, em vez de mostrar o portão. Em
`pnpm dev` funcionava, o que é o pior tipo de bug.

A causa: `/p/[slug]` declarava `revalidate = 3600` e `generateStaticParams`, o
que faz o Next tratar a rota como geração estática. Ler cookie ali **não** "cai
para dinâmico" como o comentário do arquivo afirmava — estoura
`DYNAMIC_SERVER_USAGE`.

A rota agora é dinâmica. O que muda na prática:

|                              | antes               | agora                               |
| ---------------------------- | ------------------- | ----------------------------------- |
| Página com senha             | **500**             | portão (307 → `/senha`)             |
| Consulta ao banco por visita | não (cache por tag) | não (mesmo cache)                   |
| Render no servidor           | não                 | ~15ms (medido; o estático faz ~4ms) |
| Cache de CDN na frente       | sim                 | **não**                             |

Os ~15ms não ameaçam o LCP < 1,5s da SPEC 10 — em 4G quem manda é a rede. O que
se perde é o cache de borda, e com pico sazonal de 50x isso vira invocação de
função por visita.

**Como recuperar os dois**, quando valer a pena: o portão passa a morar só em
`/p/[slug]/senha`. A página publicada volta a ser estática e, quando tem senha,
redireciona para lá sem ler cookie nenhum (redirect estático é permitido); o
portão, que já é `force-dynamic`, confere o cookie e renderiza o conteúdo com o
mesmo `BlockRenderer`. Custo: quem destrava fica com `/senha` na barra de
endereço. É uma decisão de produto, não técnica.

### Pendências conhecidas

Cada uma está anotada também no lugar certo do código:

- **Cartão de crédito** não existe: só Pix. O SPEC pede os dois; o Pix é 70% do
  volume esperado (seção 14) e o cartão precisa do Checkout Transparente, que é
  um trabalho próprio.
- **Filas Inngest** não estão montadas. `site.publish` roda inline dentro do
  webhook; `order.abandoned`, `site.expiring` e `site.purge` (SPEC 9.2) ainda não
  existem — o template do e-mail de abandono já está pronto em `lib/email.ts`.
  Junto com elas falta `media.process`: as fotos vão para o R2 do jeito que o
  navegador comprimiu (WebP, 1600px, teto de 245KB em `use-uploads.ts`), sem as
  variantes 400/800/1600 nem blurhash.
- **A tabela `Media` não é escrita.** O `SiteContent` guarda só o `mediaId` e a
  URL é derivada dele, então nada quebra — mas não existe inventário do que está
  no bucket. `deleteSiteMedia` contorna isso varrendo pelo prefixo `sites/<id>/`.
- **O bucket do R2 é público para leitura.** A SPEC 9.4 pede privado com URL
  assinada. As chaves são cuid + uuid, não adivinháveis, mas uma URL que vaze
  vale para sempre — inclusive depois da página expirar. `signReadUrl` em
  `lib/r2.ts` já existe para a virada; ela exige que `mediaMapFor` vire async na
  página publicada e que o editor passe a pedir a URL ao servidor.
- **Login por magic link** não existe. O `/painel` lista pelo mesmo cookie
  anônimo que segura os rascunhos, então trocar de aparelho perde o acesso — e
  é o mesmo cookie que autoriza trocar a senha em `/painel/[siteId]`.
- **Renovar e trocar de plano** ainda não estão em `/painel/[siteId]`: os dois
  dependem de uma tela de cobrança para página já publicada, que é assunto
  próprio. A página expirada já tem o CTA de renovação apontando para o painel.
  **Excluir já existe** (`lib/drafts.ts` → `deleteSite`), com confirmação
  digitada e purga do R2 junto — é o direito de exclusão da SPEC 9.4.
- `/criar/[occasion]` (escolha de template, SPEC 8.3) não existe — o editor entra
  direto com o preset da ocasião.
- **Reembolso não tira a página do ar.** O pedido vira `REFUNDED` e o site
  continua publicado; o e2e trava esse comportamento para ele não mudar sem
  querer. Se a regra de negócio for despublicar, o lugar é `transitionOrder`.
- Modo avançado do editor é Fase 8 no próprio SPEC.

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
