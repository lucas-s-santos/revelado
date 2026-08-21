# Especificação de Implementação — "Revelado"
### SaaS de páginas de casal com QR Code
**Documento de execução para Claude Code** · v2.0 · Agosto/2026

> **v2.0 — pivô para casais.** O produto deixou de ser multi-ocasião. Saíram as
> oito ocasiões, o model `Occasion`, o campo `SiteContent.occasion` e as telas
> `/criar` (grid) e `/criar/[occasion]`. Entraram as **paletas de revelação**
> (`lib/palettes.ts`), os **momentos do casal** (`lib/moments.ts`) e os
> **templates globais** (`lib/templates.ts`). O schema dos blocos foi para a
> **versão 2**, com migração de leitura em `lib/blocks/migrate.ts`.
>
> **v2.1 — duas peles e cartão parcelado.** A "Câmara Escura" deixou de ser a
> única pele: o padrão agora é a **clara** (creme, tinta quase-preta,
> framboesa), e a escura virou escolha de quem monta a página
> (`theme.skin`). Os tokens de superfície passaram a dizer o papel
> (`--color-bg`, `--color-surface`, `--color-ink`) em vez da cor. No checkout
> entrou **cartão em até 12x** via Checkout Pro.

---

## 0. Como usar este documento

Este arquivo é a fonte de verdade do projeto. O fluxo recomendado:

1. Crie o repositório e coloque este arquivo em `docs/SPEC.md`.
2. Copie a seção **16** para a raiz como `CLAUDE.md` — é o que o Claude Code lê automaticamente a cada sessão.
3. Execute **uma fase por sessão** (seção 13). Não peça o sistema inteiro de uma vez: o contexto satura e a qualidade cai.
4. Cada fase termina com um commit e um checklist de aceite verificado.
5. Quando algo divergir daqui, atualize este arquivo **antes** de pedir a próxima tarefa.

Comando de abertura de cada sessão:
> Leia `docs/SPEC.md` seções X e Y. Implemente a Fase N. Não invente componentes fora do inventário da seção 5. Ao terminar, rode `pnpm build` e `pnpm lint` e me mostre o que quebrou.

---

## 1. Escopo do produto

Uma pessoa monta a **página do casal dela** — fotos, carta, música e contador ao vivo desde o dia em que tudo começou —, vê o resultado num preview de celular em tempo real, paga uma vez via Pix e recebe **link + QR Code** para imprimir e entregar em mãos.

**O produto é um só.** Não há ocasião a escolher, nem ramificação de conteúdo por data: a mesma página serve do primeiro mês às bodas. O que varia é o **template** (a moldura) e a **paleta** (a cor) — nunca o público.

**Restrições de produto que dirigem toda a arquitetura:**

- A criação acontece **sem login**. A conta nasce no checkout.
- Não há passo antes do editor. O CTA cria o rascunho e cai direto nele.
- O usuário monta **antes** de pagar. Rascunho persiste sempre.
- 90% do tráfego é **mobile**, à noite, em 4G.
- A página publicada é o produto entregue — precisa abrir instantaneamente e nunca sair do ar.
- O slug é **imutável** após a publicação (o QR já foi impresso).
- Pico sazonal de até 50x, concentrado no **Dia dos Namorados (12 de junho)**.

---

## 2. Stack — decisões travadas

| Camada | Escolha | Observação para o Claude Code |
|---|---|---|
| Framework | **Next.js 15** (App Router) + React 19 | Server Components por padrão; `"use client"` só onde há interação |
| Linguagem | **TypeScript strict** | `noUncheckedIndexedAccess: true` |
| Estilo | **Tailwind CSS v4** | Config via `@theme` no CSS, não `tailwind.config.js` |
| Animação | **Motion** (`npm i motion`, import de `motion/react`) | É o Framer Motion renomeado. Aceternity e Magic UI já usam essa versão |
| Componentes base | **shadcn/ui** | Registry configurado para puxar Magic UI e Aceternity |
| Estado do editor | **Zustand** + immer + `zundo` (undo/redo) | Nada de Context para o editor — re-render demais |
| Validação | **Zod** | Schema dos blocos é zod discriminated union |
| Drag & drop | **dnd-kit** | Reordenar blocos e fotos |
| Banco | **PostgreSQL** (Neon) + **Prisma** | |
| Storage | **Cloudflare R2** via URL assinada | Upload direto do browser, nunca pelo servidor |
| Auth | **Auth.js** magic link (Resend) | Sem senha |
| Pagamento | **Mercado Pago** (Pix + cartão) | Webhook é a única fonte de verdade |
| Fila | **Inngest** | Processar imagem, e-mail, PDF, expiração |
| E-mail | **Resend** + React Email | |
| WhatsApp | **Z-API** (fase 3) | |
| Observabilidade | **Sentry** + **PostHog** | PostHog com funil configurado desde o dia 1 |
| Testes | **Vitest** (unit) + **Playwright** (e2e do funil) | |
| Deploy | **Vercel** + Cloudflare na frente | |

**Gerenciador de pacotes:** pnpm. **Node:** 22 LTS.

---

## 3. Estrutura de pastas

```
revelado/
├─ CLAUDE.md
├─ docs/
│  ├─ SPEC.md                      ← este arquivo
│  └─ MOTION-REFS.md               ← seção 6.5, links de referência
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                      ← templates e planos
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                        # landing
│  │  ├─ (marketing)/
│  │  │  ├─ exemplos/[slug]/page.tsx
│  │  │  └─ mensagens/[slug]/page.tsx    # SEO programático
│  │  ├─ actions/start-draft.ts          # Server Action: cria e redireciona
│  │  ├─ criar/page.tsx                  # passagem para o editor
│  │  ├─ editor/[draftId]/page.tsx
│  │  ├─ checkout/[draftId]/page.tsx
│  │  ├─ sucesso/[orderId]/page.tsx
│  │  ├─ painel/
│  │  │  ├─ page.tsx
│  │  │  └─ [siteId]/page.tsx
│  │  ├─ p/[slug]/
│  │  │  ├─ page.tsx                     # PÁGINA PUBLICADA (ISR)
│  │  │  ├─ opengraph-image.tsx
│  │  │  └─ senha/page.tsx
│  │  ├─ admin/…
│  │  └─ api/
│  │     ├─ upload/sign/route.ts
│  │     ├─ drafts/[id]/route.ts
│  │     ├─ checkout/route.ts
│  │     ├─ webhooks/mercadopago/route.ts
│  │     ├─ qr/[slug]/route.ts
│  │     └─ inngest/route.ts
│  ├─ components/
│  │  ├─ ui/                       # shadcn + primitivos próprios
│  │  ├─ motion/                   # componentes de motion retematizados
│  │  │  ├─ spotlight-card.tsx
│  │  │  ├─ magnetic.tsx
│  │  │  ├─ reveal.tsx
│  │  │  ├─ border-beam.tsx
│  │  │  ├─ number-ticker.tsx
│  │  │  ├─ lens.tsx
│  │  │  ├─ focus-grid.tsx
│  │  │  └─ sticky-acts.tsx
│  │  ├─ marketing/                # seções da landing
│  │  ├─ editor/                   # painel de edição
│  │  ├─ preview/                  # mockup de celular + renderer
│  │  ├─ blocks/                   # OS BLOCOS DA PÁGINA PUBLICADA
│  │  │  ├─ registry.ts            # ← mapa type → componente
│  │  │  ├─ hero-block.tsx
│  │  │  ├─ counter-block.tsx
│  │  │  ├─ gallery-block.tsx
│  │  │  └─ …
│  │  ├─ chrome/                   # nav, promo bar, footer, progress
│  │  └─ admin/
│  ├─ hooks/
│  │  ├─ use-scroll-driver.ts      # singleton de scroll
│  │  ├─ use-pointer.ts            # safelight global
│  │  ├─ use-spotlight.ts
│  │  ├─ use-magnetic.ts
│  │  ├─ use-section-progress.ts
│  │  ├─ use-reveal.ts
│  │  ├─ use-elapsed.ts
│  │  ├─ use-countdown.ts
│  │  └─ use-reduced-motion.ts
│  ├─ stores/
│  │  ├─ editor-store.ts
│  │  └─ selection-store.ts
│  ├─ lib/
│  │  ├─ blocks/
│  │  │  ├─ schema.ts              # zod dos blocos, versionado
│  │  │  ├─ defaults.ts            # conteúdo do rascunho novo
│  │  │  └─ migrate.ts             # migração entre schemaVersion
│  │  ├─ palettes.ts               # paletas de revelação (--color-accent)
│  │  ├─ moments.ts                # momentos do casal (faixa + atalhos)
│  │  ├─ templates.ts              # templates globais
│  │  ├─ plans.ts
│  │  ├─ qr.ts
│  │  ├─ r2.ts
│  │  ├─ mercadopago.ts
│  │  ├─ slug.ts
│  │  └─ utils.ts
│  ├─ emails/
│  ├─ inngest/
│  └─ styles/
│     ├─ theme.css                 # tokens (@theme do Tailwind v4)
│     └─ globals.css
├─ e2e/
└─ public/fonts/
```

---

## 4. Design system — duas peles

O vocabulário vem do laboratório fotográfico, mas ele agora se expressa em **duas peles**:

- **clara** (padrão): creme quente, tinta quase-preta, framboesa. É a pele do produto — a landing, o editor e o checkout são sempre ela.
- **escura** ("Câmara Escura"): preto arroxeado de darkroom, luz de segurança âmbar, magenta de filtro de ampliação. Deixou de ser a única e virou uma escolha de quem monta a página.

**Por que a clara é o padrão:** o produto vende presente de casal para o público amplo, e o noir era um filtro na porta — bonito, autoral e estreito.

**A regra que faz as duas funcionarem:** os tokens de superfície dizem o **papel**, não a cor (`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-ink`, `--color-ink-muted`). Nenhuma regra do `globals.css` sabe de que cor é a pele — quem escreve `rgb(var(--color-bg))` funciona nas duas. `data-skin="escura"` vai no contêiner da página publicada, ao lado de `data-palette`.

Tudo que depende da pele mora em token, inclusive o vidro (`--glass-*`), a sombra do card e a vinheta: "vidro" sobre noir é véu branco translúcido, e sobre creme o mesmo véu sumiria.

### 4.1 Cores (formato RGB sem vírgula, para permitir opacidade)

```css
@theme {
  --color-noir:      10 7 17;      /* #0A0711 fundo */
  --color-noir-2:    18 12 28;     /* #120C1C superfície */
  --color-noir-3:    26 18 40;     /* #1A1228 superfície elevada */
  --color-paper:     246 239 230;  /* #F6EFE6 texto — nunca #FFF */
  --color-muted:     155 144 170;  /* #9B90AA texto secundário */

  --color-safelight: 242 180 87;   /* #F2B457 acento primário */
  --color-magenta:   224 80 143;   /* #E0508F acento secundário */
  --color-cyan:      88 214 208;   /* #58D6D0 estados vivos */

  --color-danger:    232 90 90;
  --color-success:   111 207 140;

  /* dinâmico: sobrescrito pela paleta que a pessoa escolhe no editor */
  --color-accent:    224 80 143;
}
```

**Regra crítica:** `--color-accent` continua dinâmico — o que mudou é quem manda nele. Não é mais o calendário: é a pessoa, no passo de estilo. O padrão é o magenta do filtro de ampliação, que é a cor do produto. Toda a UI consome `accent`, nunca `magenta` diretamente (exceto o próprio default).

**Paletas de revelação** (`lib/palettes.ts`) — nomes do laboratório, não do calendário:

| id | nome | accent (RGB) | Hex |
|---|---|---|---|
| magenta | Ampliação | `224 80 143` | #E0508F |
| ambar | Luz de segurança | `242 180 87` | #F2B457 |
| rubi | Revelador | `214 74 92` | #D64A5C |
| ciano | Cianotipia | `88 214 208` | #58D6D0 |
| papel | Papel | `230 216 184` | #E6D8B8 |

**Onde o atributo vive:** `data-palette` fica no **contêiner da página** (o `BlockRenderer`, a tela de senha, o sucesso, o checkout) — nunca no `documentElement`. O editor mostra as duas paletas na mesma tela (a da interface e a da página); tingir o documento inteiro faria a interface mudar de cor a cada clique no passo de estilo. A exceção é `/dev/motion`, que troca no documento de propósito, para conferir os componentes em todas as paletas.

### 4.2 Tipografia — três papéis

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Instrument Serif** (400 + itálico) | H1, H2, preços, nomes na página publicada. Usar com parcimônia |
| Corpo | **Inter** (300/400/500) | Todo o resto. Peso 300 em textos longos |
| Utilidade | **JetBrains Mono** (400/500) | Contadores, eyebrows, labels, dados, timestamps |

Carregar via `next/font/google` com `display: 'swap'` e `variable`.

**Regras:**
- Contadores e valores numéricos: `font-variant-numeric: tabular-nums` obrigatório (senão o dígito pula a cada segundo).
- Eyebrows: mono, `0.68rem`, `uppercase`, `letter-spacing: 0.18em`.
- Display: `letter-spacing: -0.02em`, `line-height: 0.98` em tamanhos grandes.
- Itálico do display recebe gradiente `accent → magenta` com `background-clip: text`.

Escala: `clamp()` em tudo que é display. Base 16px, corpo 1rem, `line-height: 1.6`.

### 4.3 Outros tokens

```css
--radius-sm: 10px;  --radius-md: 16px;  --radius-lg: 24px;  --radius-pill: 999px;
--ease-out: cubic-bezier(.16,.84,.44,1);
--ease-in-out: cubic-bezier(.65,0,.35,1);
--dur-fast: 180ms; --dur-base: 320ms; --dur-slow: 620ms;
--maxw: 1200px;
--shadow-card: 0 26px 60px -30px rgb(0 0 0 / .8);
--shadow-glow: 0 14px 40px -14px rgb(var(--color-accent) / .8);
```

Superfícies de vidro: `background: linear-gradient(165deg, rgb(255 255 255/.055), rgb(255 255 255/.018))` + `backdrop-filter: blur(14px)` + borda de 1px com gradiente via `mask-composite: exclude`.

Texturas de fundo permitidas: **grid de 62px** com máscara radial, **noise SVG** em `opacity: .05`, **mesh gradient** com `filter: blur(70px)`. Nunca as três na mesma dobra.

---

## 5. Inventário de componentes

**Regra de ouro:** o Claude Code só pode usar componentes desta lista. Se precisar de algo fora dela, deve perguntar antes.

### 5.1 Instalação de bibliotecas externas

Configure o `components.json` do shadcn com os registries:

```jsonc
{
  "registries": {
    "@magicui": "https://magicui.design/r/{name}.json",
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json"
  }
}
```

Magic UI expõe um **MCP server** — vale plugar no `.mcp.json` do projeto para o Claude Code instalar componentes direto, em vez de colar código.

### 5.2 Componentes de biblioteca — o que instalar e onde usar

| Componente | Lib | Onde | Fase |
|---|---|---|---|
| **Border Beam** | Magic UI | Card do checkout e do login do painel | 1 |
| **Shine Border** | Magic UI | Plano em destaque (versão contida do beam) | 1 |
| **Number Ticker** | Magic UI | "1.482 páginas criadas", total do checkout, contadores do painel | 1 |
| **Blur Fade** | Magic UI | Entrada escalonada de grids e galerias | 1 |
| **Magic Card** | Magic UI | Cards de bloco e de plano (gradiente seguindo o cursor) | 1 |
| **Lens** | Magic UI | Zoom nas fotos dentro do editor e da galeria | 2 |
| **Animated List** | Magic UI | Painel lateral de fotos selecionadas; notificações do admin | 2 |
| **Marquee** | Magic UI | Faixa de momentos do casal rolando na landing | 1 |
| **Confetti** | Magic UI | Tela de sucesso após publicar | 2 |
| **Scroll Progress** | Magic UI | Barra de progresso do topo | 1 |
| **Smooth Cursor** | Magic UI | Landing desktop apenas (opcional, testar A/B) | 3 |
| **Focus Cards** | Aceternity | **Grid de fotos**: irmãs desfocam no hover | 2 |
| **Glowing Effect** | Aceternity | Borda que segue o ponteiro — marca foto/plano selecionado | 2 |
| **Card Spotlight** | Aceternity | Cards de bloco (alternativa ao Magic Card) | 1 |
| **Expandable Cards** | Aceternity | Foto → fullscreen com `layoutId` | 2 |
| **Parallax Hero Images** | Aceternity | Hero da landing: profundidades dirigidas pelo mouse | 1 |
| **Sticky Scroll Reveal** | Aceternity | Seção "como funciona" em três atos | 1 |
| **Container Scroll Animation** | Aceternity | Mockup de celular "saindo da tela" ao rolar | 2 |
| **Parallax Scroll** | Aceternity | Galeria de exemplos (duas colunas em direções opostas) | 2 |
| **Tracing Beam** | Aceternity | Páginas de SEO programático, acompanha o scroll | 3 |
| **Spotlight New** | Aceternity | Cone de luz atrás do hero e do checkout | 1 |
| **Dotted Glow Background** | Aceternity | Fundo do editor e do painel (contido) | 2 |
| **Aurora Background** | Aceternity | Somente a landing. **Nunca** no painel | 1 |
| **Magnetic Button** | Aceternity | CTAs principais | 1 |
| **Stateful Button** | Aceternity | Botões com loading/sucesso (publicar, pagar) | 1 |
| **Multi Step Loader** | Aceternity | Transição "publicando sua página" | 2 |
| **File Upload** | Aceternity | Área de upload de fotos no editor | 2 |
| **Compare** | Aceternity | Landing: antes/depois de uma página | 3 |
| **Sidebar** / **Resizable Navbar** | Aceternity | Navegação do painel e da landing | 1 |
| **Sign In Sections** | Hover.dev | Referência para a tela de acesso ao painel | 2 |
| **TextParallaxContent** | Hover.dev | Seção de exemplos na landing | 3 |
| **Grids** (categoria) | Hover.dev | Referência de layout antes de fechar o grid | 2 |

### 5.3 Componentes próprios — contratos

Estes **não existem** nas bibliotecas e precisam ser escritos:

```ts
// components/motion/spotlight-card.tsx
// Card de vidro com anel de borda iluminado seguindo o ponteiro.
// Escreve --sx/--sy no próprio nó, sem re-render do React.
interface SpotlightCardProps {
  accent?: string;          // RGB "224 80 143"; default = var(--color-accent)
  radius?: number;          // px do halo, default 240
  lift?: boolean;           // translateY(-3px) no hover
  as?: ElementType;
  children: ReactNode;
}

// components/motion/magnetic.tsx
interface MagneticProps {
  strength?: number;        // 0..1, default .3
  radius?: number;          // px, default 120
  spring?: { stiffness: number; damping: number }; // default 150/15
  children: ReactNode;
}

// components/motion/reveal.tsx
interface RevealProps {
  y?: number;               // deslocamento inicial, default 22
  delay?: number;
  once?: boolean;           // default true
  children: ReactNode;
}

// components/motion/focus-grid.tsx
// Grid de fotos: hover desfoca as irmãs, seleção com borda glow,
// clique expande com shared layout. Virtualizado acima de 60 itens.
interface FocusGridProps {
  items: MediaItem[];
  selectable?: boolean;
  selected?: string[];
  onSelect?: (id: string) => void;
  onExpand?: (id: string) => void;
  columns?: { base: number; md: number; lg: number };
}

// components/preview/phone-frame.tsx
// Mockup de celular que renderiza o BlockRenderer com o JSON ao vivo.
interface PhoneFrameProps {
  content: SiteContent;
  scale?: number;
  interactive?: boolean;    // permite rolar dentro do mockup
}

// components/blocks/block-renderer.tsx
// Consome o registry e renderiza a lista de blocos. Usado tanto no
// preview quanto na página publicada — MESMO componente, sem duplicação.
interface BlockRendererProps {
  content: SiteContent;
  mode: "preview" | "published";
}
```

### 5.4 Primitivos (`ui/`)

`Button` (variants: primary | ghost | quiet | danger; sizes: sm | md | lg), `Input`, `Textarea`, `Select`, `Switch`, `Slider`, `Tabs`, `Sheet`, `Dialog`, `Tooltip`, `Toast` (sonner), `Skeleton`, `Badge`, `Eyebrow`, `Frame` (foto com grão + vinheta), `EmptyState`, `Stepper`.

---

## 6. Especificação de motion

### 6.1 Princípios

1. **Uma ideia por dobra.** No máximo dois efeitos ambientais por tela.
2. **O painel administrativo é quase estático.** Quem usa todo dia odeia interface que se mexe. Motion no painel só para feedback de ação.
3. **Nada anima cor de fundo, largura ou altura.** Só `transform`, `opacity`, `filter` e `clip-path`.
4. **Spring para interação, easing para entrada.** Se responde ao usuário, é spring. Se é revelação por scroll, é `--ease-out`.
5. `prefers-reduced-motion` desliga tudo. Não é opcional.

### 6.2 Presets

```ts
export const spring = {
  snappy:  { type: "spring", stiffness: 400, damping: 30 },   // botões, toggles
  smooth:  { type: "spring", stiffness: 150, damping: 20 },   // magnético, drag
  gentle:  { type: "spring", stiffness: 90,  damping: 18 },   // layout shift
  bouncy:  { type: "spring", stiffness: 300, damping: 12 },   // confete, sucesso
} as const;

export const ease = {
  out:   [0.16, 0.84, 0.44, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;
```

Durações: micro-interação 180ms · transição de componente 320ms · revelação de seção 620ms · nada passa de 800ms.

### 6.3 Mapa tela → efeito

| Tela | Efeito | Implementação |
|---|---|---|
| Landing / hero | Luz que segue o mouse ("safelight") | `use-pointer` escreve `--mx/--my` no `:root`; um `div fixed` com radial-gradient e `mix-blend-mode: screen` consome. **Um listener para a página toda** |
| Landing / hero | Parallax de profundidade | `Parallax Hero Images` + `use-section-progress` para o mockup |
| Landing / topo | Barra de progresso | `Scroll Progress` (Magic UI) ou `scaleX` num ref |
| Landing / blocos | Spotlight no card, **sem trocar accent** | `SpotlightCard` próprio. A troca de accent global saiu na v2.1: a paleta é do conteúdo, e mexer nela no `documentElement` faria a landing piscar de cor |
| Landing / como funciona | Sticky em três atos com trilho preenchendo | `Sticky Scroll Reveal` ou `use-sticky-acts` próprio |
| Landing / revelação | **Assinatura**: fotos saem de `saturate(.06) blur(5px)` para nítidas conforme o scroll, com stagger | `use-section-progress` escreve `--dev`; CSS puro no filtro. Zero JS por frame |
| Landing / CTA | Botão magnético | `Magnetic` próprio com spring `smooth` |
| Landing / prova | Contadores subindo | `Number Ticker` disparado por IntersectionObserver |
| Landing / faixa | Marquee de momentos do casal | `Marquee` (Magic UI), pausar no hover |
| Editor | Preview atualizando ao digitar | Zustand + `useDeferredValue`; nunca animar o preview inteiro |
| Editor | Reordenar blocos | `dnd-kit` + `layout` prop do Motion, spring `gentle` |
| Editor | Grid de fotos | `FocusGrid` (Focus Cards + Glowing Effect + Lens) |
| Editor | Foto → fullscreen | `layoutId` compartilhado, spring `gentle` |
| Checkout | Borda viva no card | `Border Beam` |
| Checkout | Total recalculando | `Number Ticker` |
| Checkout | Pix confirmado | `Multi Step Loader` → `Confetti` |
| Página publicada | Blocos revelando ao rolar | `Reveal` próprio, `once: true`, stagger de 60ms |
| Página publicada | Contador ao vivo | `use-elapsed`, `setInterval` de 1s, `tabular-nums` |
| Painel | Entrada da lista | `Blur Fade` com stagger curto. Nada além disso |

### 6.4 Regras de performance

- **Um único `ScrollDriver`**: módulo singleton com `Set` de subscribers, 1 listener passivo, throttle por `requestAnimationFrame`. Todos os hooks de scroll assinam nele. Proibido `addEventListener('scroll')` avulso em componente.
- Mesma regra para `pointermove`: um listener global escrevendo CSS vars.
- Efeitos de hover em card escutam **apenas enquanto o ponteiro está dentro**.
- `will-change` só no elemento ativo, removido depois. Nunca em lista inteira.
- `Lens` e `Focus Cards` desligados em `(pointer: coarse)`.
- Grid acima de 60 fotos: virtualizar (`@tanstack/react-virtual`).
- Imagens: `next/image` com `sizes` correto, `placeholder="blur"` via blurhash, variantes 400/800/1600 em AVIF/WebP.
- Toda animação de entrada usa `once: true`. Nada re-anima ao rolar de volta.

### 6.5 Referências de motion (a preencher)

> **Slot aberto.** Cole aqui os links que você vai me mandar. Para cada um, registrar:
>
> | Link | Efeito observado | Onde aplicar | Componente equivalente |
> |---|---|---|---|
> | | | | |
>
> Manter em `docs/MOTION-REFS.md` e referenciar no prompt da fase correspondente.

---

## 7. Modelo de dados

### 7.1 Prisma (essencial)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  phone     String?
  sites     Site[]
  orders    Order[]
  createdAt DateTime @default(now())
}

model Site {
  id            String     @id @default(cuid())
  userId        String?
  anonId        String?    // cookie do rascunho pré-login
  slug          String     @unique
  templateId    String?
  content       Json       // SiteContent — ver 7.2
  schemaVersion Int        @default(1)
  status        SiteStatus @default(DRAFT)
  passwordHash  String?
  indexable     Boolean    @default(false)
  publishedAt   DateTime?
  expiresAt     DateTime?  // null = vitalício
  viewsCount    Int        @default(0)
  firstViewedAt DateTime?
  deletedAt     DateTime?
  media         Media[]
  guestbook     GuestbookEntry[]
  @@index([userId]) @@index([anonId]) @@index([status, expiresAt])
}

enum SiteStatus { DRAFT PENDING_PAYMENT PUBLISHED EXPIRED }

model Media {
  id          String   @id @default(cuid())
  siteId      String
  key         String   // chave no R2
  mime        String
  width       Int
  height      Int
  bytes       Int
  blurhash    String?
  position    Int      @default(0)
  processedAt DateTime?
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  @@index([siteId, position])
}

// O model Occasion saiu na v2. Templates são globais.
model Template {
  id           String  @id
  name         String
  previewUrl   String
  preset       Json    // theme parcial: paleta, fonte, efeito, ordem dos blocos
  planRequired String?
  active       Boolean @default(true)
  order        Int     @default(0)

  @@index([active, order])
}

model Plan {
  id         String  @id
  name       String
  priceCents Int
  listCents  Int     // preço "de", riscado
  durationDays Int?  // null = vitalício
  maxPhotos  Int
  features   Json
  active     Boolean @default(true)
}

model Order {
  id          String      @id @default(cuid())
  userId      String
  siteId      String
  planId      String
  bumpForever Boolean     @default(false)
  amountCents Int
  couponId    String?
  status      OrderStatus @default(PENDING)
  provider    String      @default("mercadopago")
  providerRef String?     @unique
  paidAt      DateTime?
  createdAt   DateTime    @default(now())
  @@index([status, createdAt])
}

enum OrderStatus { PENDING PAID REFUNDED FAILED EXPIRED }

model Coupon {
  id         String   @id @default(cuid())
  code       String   @unique
  type       String   // "percent" | "fixed"
  value      Int
  validUntil DateTime?
  maxUses    Int?
  uses       Int      @default(0)
}

model GuestbookEntry {
  id        String   @id @default(cuid())
  siteId    String
  name      String
  message   String
  approved  Boolean  @default(false)
  ipHash    String   // LGPD: nunca guardar IP cru
  createdAt DateTime @default(now())
  site      Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
}

model SiteView {
  id     String   @id @default(cuid())
  siteId String
  day    DateTime @db.Date
  count  Int      @default(0)
  @@unique([siteId, day])   // agregado por dia, nunca log cru
}
```

**Regras não negociáveis:** soft delete via `deletedAt` em `Site`; `slug` imutável após `PUBLISHED`; nenhuma query no app sem filtrar `deletedAt: null`.

### 7.2 Schema dos blocos

O coração da arquitetura. A página **é** uma lista ordenada de blocos em JSON. Nunca modelar `foto1`, `foto2`, `nomeNamorado` — isso morre no segundo template.

```ts
// lib/blocks/schema.ts
import { z } from "zod";

export const blockSchemas = {
  hero: z.object({
    title: z.string().max(80),
    subtitle: z.string().max(120).optional(),
    mediaId: z.string().optional(),
    align: z.enum(["left", "center"]).default("center"),
    overlay: z.number().min(0).max(1).default(0.45),
  }),
  counter: z.object({
    mode: z.enum(["since", "until"]),
    date: z.string().datetime(),
    label: z.string().max(40).default("juntos há"),
    units: z.array(z.enum(["y","mo","d","h","m","s"])).default(["y","mo","d","h","m","s"]),
  }),
  letter: z.object({
    text: z.string().max(4000),
    typewriter: z.boolean().default(false),
    signature: z.string().max(60).optional(),
  }),
  gallery: z.object({
    layout: z.enum(["carousel","grid","polaroid","stack"]).default("carousel"),
    mediaIds: z.array(z.string()).min(1).max(60),
    captions: z.record(z.string()).optional(),
  }),
  music: z.object({
    provider: z.enum(["spotify","youtube"]),
    trackId: z.string(),
    autoplay: z.boolean().default(false),   // política de autoplay: exige gesto
  }),
  timeline: z.object({
    items: z.array(z.object({
      date: z.string(),
      title: z.string().max(60),
      text: z.string().max(400).optional(),
      mediaId: z.string().optional(),
    })).max(24),
  }),
  reasons: z.object({
    title: z.string().max(60),
    items: z.array(z.string().max(140)).max(100),
  }),
  guestbook: z.object({
    title: z.string().max(60),
    moderated: z.boolean().default(true),
  }),
  map: z.object({ lat: z.number(), lng: z.number(), label: z.string().max(60) }),
  video: z.object({ provider: z.enum(["upload","youtube"]), ref: z.string() }),
  capsule: z.object({ openAt: z.string().datetime(), text: z.string().max(2000) }),
  stats: z.object({
    items: z.array(z.object({ value: z.string().max(12), label: z.string().max(40) })).max(6),
  }),
  footer: z.object({ text: z.string().max(120) }),
} as const;

export const blockSchema = z.discriminatedUnion("type",
  Object.entries(blockSchemas).map(([type, props]) =>
    z.object({ id: z.string(), type: z.literal(type), props })
  ) as any
);

export const siteContentSchema = z.object({
  schemaVersion: z.literal(2),   // v2: saiu `occasion`, palette virou enum
  theme: z.object({
    template: z.string(),
    palette: z.enum(PALETTE_IDS).default("magenta"),
    font: z.enum(["serif","sans","mixed"]).default("mixed"),
    effect: z.enum(["none","hearts","confetti","snow","stars"]).default("none"),
  }),
  blocks: z.array(blockSchema).min(1).max(30),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type Block = z.infer<typeof blockSchema>;
```

**Registry** (`components/blocks/registry.ts`): mapa `type → { component, editor, icon, label, plan }`. Adicionar um bloco novo = criar o componente, o painel de edição e uma linha no registry. Nada mais.

**Migração:** `lib/blocks/migrate.ts` recebe `(content, fromVersion)` e devolve o content na versão atual. Rodar na leitura, sempre. Nunca fazer migração destrutiva no banco.

---

## 8. Especificação das telas

Formato de cada tela: objetivo · layout · estados · componentes · aceite.

### 8.1 `/` — Landing

**Objetivo:** levar ao editor no menor número de decisões possível — hoje, **zero**: o CTA é um `form` que chama a Server Action `startDraft`, cria o rascunho e redireciona.

**Seções, em ordem:**
1. Barra de promoção sticky com contagem regressiva real até o Dia dos Namorados e pulso magenta. Dismissível (guardar em cookie).
2. Nav em vidro que solidifica após 40px de scroll.
3. Hero: foto de fundo revelada (ver 8.1.1) · eyebrow · H1 display com itálico em gradiente · lede · CTA magnético + link para o exemplo · prova social com `Number Ticker`. À direita, mockup de celular com contador rodando ao vivo e cartão de QR inclinado, ambos em parallax.
4. Marquee dos momentos do casal (`lib/moments.ts`) — texto, sem link: não há o que escolher.
5. "Como funciona" em três atos sticky.
6. Grid dos **blocos** — o que vai dentro da página. Server Component, sem troca de accent.
7. **Revelação** (assinatura): quatro fotos revelando conforme o scroll.
8. Preços: três planos, o do meio destacado, order bump clicável, total recalculando.
9. Prova social: três depoimentos em SpotlightCard.
10. FAQ em acordeão (`grid-template-rows: 0fr → 1fr`).
11. CTA final com glow e contagem regressiva.
12. Rodapé.

**Aceite:** LCP < 2,5s em 4G simulado · sem CLS no carregamento das fontes · funil registrado no PostHog · tudo navegável por teclado · `prefers-reduced-motion` remove safelight e revelações.

#### 8.1.1 A foto do hero

Fonte em `assets/hero.png` (fora de `public/`, que é servido). `scripts/prepare-hero.mjs` a revela e gera as variantes; roda sob demanda, nunca no build.

A gradação é a marca virando imagem: dessatura, empurra as sombras para o noir arroxeado, joga o filtro magenta de ampliação por cima e deixa **o sol como única brasa quente** — o pôr do sol vira a luz de segurança do laboratório. Vinheta e sangria das bordas para `--color-noir`, para a foto terminar na cor do fundo em vez de num corte reto. Grão de filme por cima, que é da marca e disfarça a resolução curta do original.

Direção de arte com `<picture>`, não `next/image`: no celular vai um recorte **retrato** fechado nos dois; no desktop, o **2,2:1**. Enquadramento diferente é decisão de arte, e `next/image` só resolveria resolução.

Regra de efeitos: a foto **ocupa a vaga** do cone de `Spotlight` no hero. Safelight + foto = os dois da SPEC 6.1. Não somar um terceiro.

**Gradação na pele clara:** a foto não é rebaixada ao escuro — é **lavada para dentro do creme**, como um print que ainda está aparecendo na bandeja do revelador. Fica textura, não imagem: baixo contraste, preto levantado, e o disco solar sobrando como único ponto denso. É o que deixa a tinta quase-preta passar por cima com folga.

**Contraste, medido e não estimado:** com o véu do `.hero::before`, o pior caso na coluna do texto dá **13,3:1** para `--color-ink` e **5,8:1** para `--color-ink-muted` no desktop; **11,8:1** e **5,2:1** no mobile. Foi essa medição que obrigou `--color-ink-muted` a ser mais denso do que "parecia bonito": no valor original ele passava no creme puro (4,9:1) e falhava sobre a foto.

**Orçamento:** cada variante < 250 KB (a de 1718px sai em ~9 KB AVIF).

### 8.2 `/criar` — Passagem para o editor

Sem grid: o produto é um só. A tela é o botão, que submete para a Server Action `startDraft` — cria um `Site` em `DRAFT` com `anonId` de cookie e redireciona para `/editor/[draftId]`.

É Server Action e não Server Component com `redirect` porque `ensureAnonId` grava cookie, e no App Router só Action e Route Handler escrevem. De quebra: funciona sem JavaScript, e robô que passa na URL não cria rascunho. `robots: noindex`.

**Aceite:** rascunho criado no servidor antes da navegação; um clique do CTA ao editor.

### 8.3 Templates

Cinco templates **globais** (`lib/templates.ts`), não mais dois por ocasião. Cada um carrega `preset` (paleta, fonte, efeito, ordem dos blocos), nunca conteúdo — trocar de template não apaga o que a pessoa escreveu. Filtro por plano ("disponível no Especial"). A escolha vive dentro do editor, no passo de estilo.

### 8.4 `/editor/[draftId]` — O coração do produto

**Layout desktop:** duas colunas. Esquerda (420px) = controles. Direita = `PhoneFrame` sticky com preview ao vivo.
**Layout mobile:** preview fixo no topo (40vh), controles em folha deslizante embaixo, com abas.

**Modo simples (padrão):** stepper de 5 passos — Quem · Quando · Fotos · Mensagem · Estilo. Um passo por tela, barra de progresso, botão voltar.
**Modo avançado:** lista de blocos arrastáveis, adicionar/remover/reordenar, painel de props por bloco.

**Comportamentos obrigatórios:**
- Autosave com debounce de 800ms → `PATCH /api/drafts/[id]`. Indicador discreto "salvo".
- Undo/redo (`zundo`), atalhos ⌘Z / ⌘⇧Z.
- Upload: comprimir no browser (`browser-image-compression`, alvo 1600px / 300KB) → URL assinada → R2 direto. Barra de progresso por arquivo, retry automático, reordenar por arrastar.
- Recuperação: se o usuário fechar e voltar, restaurar do servidor. Nunca perder trabalho — este é o requisito mais importante da tela.
- Validação inline, mensagens em português, nunca bloquear o avanço por bobagem.
- Botão "ver no meu celular": gera QR temporário do preview.
- Limite de fotos conforme o plano-alvo, com upsell contextual ("mais 25 fotos no Especial").

**Estado:** Zustand com `content`, `dirty`, `saving`, `history`. O preview lê do mesmo store com `useDeferredValue`.

**Aceite:** digitar no campo de mensagem não causa jank no preview (medir com React DevTools Profiler) · upload de 20 fotos de 5MB em 4G conclui sem travar a UI · fechar a aba e voltar restaura tudo.

### 8.5 `/checkout/[draftId]`

**Meios de pagamento.** Pix (padrão) e **cartão em até 12x sem juros**.

O Pix cria um `Payment` direto e a gente já sai sabendo o id dele. O cartão cria uma `Preference` e manda para o **Checkout Pro** — nenhum dado de cartão passa pelo nosso servidor, que é o que nos mantém fora do escopo de PCI. O preço disso: o id do pagamento só existe depois que a pessoa paga, então o webhook resolve o pedido pelo `external_reference` e, assim que resolve, grava o id real — da segunda notificação em diante a idempotência por `providerRef` volta a valer.

**Parcela:** teto de 12x com piso de R$ 3 por parcela (`lib/plans.ts`). Prometer na vitrine o que o provedor recusa no checkout é o pior jeito de perder a venda, então a vitrine e a cobrança usam **a mesma função**. Arredonda para baixo: a soma das parcelas nunca passa do total.

Resumo da página + três planos + order bump ("deixar para sempre, +R$ 9") + campo de cupom + e-mail (obrigatório — é onde a conta nasce) + Pix ou cartão.

**Fluxo Pix:** gerar cobrança → mostrar QR e código copiável na própria tela → polling a cada 3s **e** webhook. Ao confirmar: `Multi Step Loader` → publica → `Confetti` → redireciona para `/sucesso`.

**Regras:** nunca publicar sem webhook confirmado. Pagamento que confirma 2 dias depois publica normalmente. Abandono dispara e-mail em 30 minutos com link direto de volta.

**Aceite:** teste e2e cobrindo pago, pendente, expirado e reembolsado.

### 8.6 `/sucesso/[orderId]`

Link da página · botão copiar · QR em PNG/SVG · PDF do cartão A6 · botões de compartilhar (WhatsApp em primeiro lugar) · upsell do cartão impresso. E-mail e WhatsApp já enviados neste ponto.

### 8.7 `/painel` e `/painel/[siteId]`

Lista de páginas com status. Detalhe: editar, baixar QR, estatísticas (visitas, primeira abertura, último acesso), renovar/upgrade, trocar senha, excluir. Interface **sóbria** — sem aurora, sem beam, sem partícula.

**Notificação de primeira visita** ("sua página foi aberta 🎉") é o maior gatilho emocional do produto e a maior fonte de compartilhamento. Implementar cedo.

### 8.8 `/p/[slug]` — A página publicada

**A tela mais importante do sistema.** É o produto entregue.

- Server Component, **estática com ISR**, revalidação por tag ao editar. Uma página viralizada não pode custar nem cair.
- `BlockRenderer` percorre `content.blocks` e renderiza pelo registry.
- Blocos revelam ao rolar com `once: true`, stagger de 60ms.
- Contador roda no cliente, `tabular-nums`, sem layout shift.
- Música: só toca após gesto do usuário (política de autoplay). Botão flutuante discreto.
- `opengraph-image.tsx` gerando card com a foto principal e os nomes — é marketing gratuito no WhatsApp.
- Se `passwordHash`, redirecionar para `/p/[slug]/senha`.
- Se `indexable === false`, `noindex`.
- Se expirada, página de "esta página expirou" com CTA de renovação (não 404).
- Registrar visita de forma agregada e assíncrona, sem bloquear o render.

**Aceite:** abre em menos de 1,5s em 4G · funciona com JS desabilitado até o primeiro paint · testada em iPhone e Android antigo.

### 8.9 `/admin`

Vendas, funil por etapa, receita por plano e por meio de pagamento, CRUD de templates (criar template sem deploy), fila de moderação, cupons, busca de pedido, reenvio de e-mail, reembolso. Protegido por role. Zero enfeite.

---

## 9. Backend

### 9.1 Rotas de API

| Rota | Método | Função |
|---|---|---|
| `/api/drafts/[id]` | PATCH | Autosave do content (valida com zod, rejeita se `PUBLISHED`) |
| `/api/upload/sign` | POST | URL assinada do R2; valida mime, tamanho e cota do plano |
| `/api/checkout` | POST | Cria `Order` + cobrança no Mercado Pago |
| `/api/webhooks/mercadopago` | POST | **Fonte de verdade.** Idempotente por `providerRef` |
| `/api/qr/[slug]` | GET | PNG/SVG do QR, cacheado |
| `/api/sites/[id]/view` | POST | Incremento agregado de visita |
| `/api/inngest` | POST | Handler das filas |

### 9.2 Jobs (Inngest)

`media.process` (variantes + blurhash + AVIF/WebP) · `site.publish` (gera QR, PDF, dispara e-mail/WhatsApp) · `order.abandoned` (30min) · `site.expiring` (aviso 15 dias antes) · `site.purge` (30 dias após expirar) · `site.first-view` (notificação).

### 9.3 QR Code

Nível de correção **H**. Entregar PNG 2048px, SVG vetorial e **PDF A6 pronto para imprimir** com moldura e frase. URL curta, slug imutável. Testar impressão real em papel comum antes de lançar.

### 9.4 Segurança e LGPD

Slug com sufixo aleatório (não adivinhável) · storage privado com URL assinada · senha opcional na página · `noindex` por padrão · IP em hash no mural · direito de exclusão apagando também o R2 · consentimento de marketing separado do contrato · DPA com Vercel, Cloudflare e Mercado Pago · moderação automática de imagem + botão de denúncia em toda página publicada.

**Música:** nunca hospedar áudio. Só embed oficial de Spotify/YouTube — a licença é deles.

---

## 10. Orçamento de performance

| Métrica | Limite |
|---|---|
| LCP (landing, 4G) | < 2,5s |
| LCP (página publicada, 4G) | < 1,5s |
| CLS | < 0,05 |
| INP | < 200ms |
| JS na página publicada | < 120KB gzip |
| JS na landing | < 220KB gzip |
| Maior imagem servida | < 250KB |

Bundle analyzer no CI. PR que estourar o orçamento não passa.

---

## 11. Acessibilidade e qualidade

- Contraste mínimo 4.5:1 no texto de corpo. O `--color-muted` sobre `--color-noir` passa; conferir os accents claros (casamento, memorial) sobre vidro.
- Foco visível em tudo: `outline: 2px solid rgb(var(--color-accent))`, `offset: 3px`.
- Toda animação de entrada é decorativa → `aria-hidden` nos elementos puramente visuais (grid, noise, mesh, safelight).
- Acordeão, tabs, dialog e sheet com semântica correta (usar Radix via shadcn, não recriar).
- Formulários com `label` real, erro associado por `aria-describedby`.
- `prefers-reduced-motion` desliga safelight, parallax, revelações e marquee.
- Alt text nas fotos: no editor, campo opcional "descreva a foto"; default = a legenda, ou o título da capa quando não houver legenda.
- Testar com teclado do começo ao fim do funil.

**Voz da interface:** verbos ativos, frases curtas, tom conversacional. O botão que diz "Publicar" gera o aviso "Publicado". Erros explicam o que aconteceu e o que fazer — nunca pedem desculpa nem são vagos. Tela vazia é convite para agir, não recado triste.

---

## 12. Convenções

- Componentes em `PascalCase.tsx`, hooks em `use-kebab.ts`, utilitários em `kebab.ts`.
- Server Component é o padrão. `"use client"` só na folha da árvore que precisa de interação — nunca num layout.
- Nada de `any`. Tipos derivados do zod com `z.infer`.
- Toda entrada de usuário passa por zod, no cliente **e** no servidor.
- Data e hora sempre em UTC no banco, formatadas em `America/Sao_Paulo` na exibição.
- Valores monetários em centavos, inteiros. Nunca float.
- Textos da UI em `pt-BR`, centralizados em `lib/copy.ts` desde o início (facilita o espanhol na fase 4).
- Commits em conventional commits. Um PR por fase.

### Anti-padrões — o que NÃO fazer

1. **Não** modelar a página com colunas fixas no banco. É JSON de blocos, ponto.
2. **Não** duplicar o renderer entre preview e página publicada. É o mesmo componente.
3. **Não** empilhar Aurora + Meteors + Sparkles + Border Beam na mesma tela. Vira landing genérica de IA.
4. **Não** colocar motion ambiental no painel ou no admin.
5. **Não** registrar `scroll` ou `pointermove` em componente. Usar os drivers singleton.
6. **Não** publicar página sem webhook de pagamento confirmado.
7. **Não** exigir login antes do editor.
8. **Não** processar imagem no request. Vai para a fila.
9. **Não** hospedar arquivo de música.
10. **Não** usar `localStorage` como fonte de verdade do rascunho — o servidor é a fonte, o local é só cache.

---

## 13. Ordem de execução

Uma fase por sessão do Claude Code. Cada fase tem critério de aceite verificável.

### Fase 0 — Fundação
Projeto Next.js 15 + TS strict + Tailwind v4 + shadcn · fontes via `next/font` · `styles/theme.css` com todos os tokens da seção 4 · `lib/utils.ts` · ESLint/Prettier · Prisma + schema da seção 7.1 + migration + seed de templates e planos · Sentry e PostHog · CI com build, lint, typecheck e bundle analyzer.
**Aceite:** `pnpm build` limpo; página em branco renderizando com os tokens aplicados.

### Fase 1 — Camada de motion e primitivos
Hooks: `use-scroll-driver`, `use-pointer`, `use-spotlight`, `use-magnetic`, `use-section-progress`, `use-reveal`, `use-reduced-motion` · componentes `SpotlightCard`, `Magnetic`, `Reveal`, `StickyActs`, `Frame` · instalar da Magic UI: Border Beam, Shine Border, Number Ticker, Blur Fade, Marquee, Scroll Progress · da Aceternity: Spotlight New, Magnetic Button, Stateful Button · **retematizar todos com os tokens**, sem cor hardcoded.
**Aceite:** página `/dev/motion` demonstrando cada componente; um só listener de scroll e um só de pointer no documento inteiro (verificar no DevTools).

### Fase 2 — Landing completa
As 12 seções da 8.1 · responsivo até 360px · funil no PostHog · `prefers-reduced-motion`.
**Aceite:** Lighthouse mobile ≥ 90 em performance e ≥ 95 em acessibilidade; orçamento da seção 10 respeitado.

### Fase 3 — Motor de blocos
`lib/blocks/schema.ts` · `registry.ts` · blocos hero, counter, letter, gallery, music, timeline, footer · `BlockRenderer` · `PhoneFrame` · `defaults.ts` (conteúdo do rascunho novo) · `migrate.ts`.
**Aceite:** renderizar um `SiteContent` fixo em preview e em `/p/[slug]` com o mesmo componente e resultado idêntico.

### Fase 4 — Editor
Store Zustand + undo/redo · modo simples (stepper de 5 passos) · autosave com debounce · upload comprimido para o R2 com progresso e retry · `FocusGrid` com Focus Cards + Lens + Glowing Effect · reordenação com dnd-kit · recuperação de rascunho · limites por plano com upsell.
**Aceite:** montar uma página inteira do zero em menos de 5 minutos num celular real, fechar a aba, voltar e encontrar tudo salvo.

### Fase 5 — Checkout e publicação
`/checkout` com planos, bump, cupom · Mercado Pago Pix + cartão · webhook idempotente · `site.publish` na fila · geração de QR (PNG/SVG/PDF) · e-mail transacional · `/sucesso` · `/painel` básico.
**Aceite:** e2e cobrindo pago, pendente, expirado e reembolsado; QR impresso em papel comum escaneia em três aparelhos.

### Fase 6 — Página publicada em produção
ISR + revalidação por tag · `opengraph-image` · senha · expiração com página própria · contagem de visitas agregada · `noindex` configurável · notificação de primeira visita.
**Aceite:** LCP < 1,5s em 4G; card do WhatsApp renderizando certo.

### Fase 7 — Crescimento
Blocos V2 (mural, vídeo, mapa, cápsula, motivos, stats) · mais templates · estatísticas do painel · SEO programático (`/exemplos`, `/mensagens`) · admin completo · moderação · cupons e afiliados.

### Fase 8 — Escala
Modo avançado do editor · produtos físicos · B2B/white label · assistente de IA para a mensagem · espanhol.

---

## 14. Métricas a instrumentar desde a fase 2

Funil no PostHog: `landing_view → editor_opened → editor_completed → checkout_opened → payment_started → payment_confirmed`.

`occasion_selected` saiu na v2 junto com o grid que ele media. Não entrou evento de clique no lugar: o CTA é um `form` para Server Action, sem JavaScript no caminho, e quem abre o funil agora é `editor_opened`.

Metas: visitante→editor > 25% · editor→checkout > 35% · checkout→pago > 45% · conversão total 3–6% · tempo até publicar < 8min · Pix ≈ 70% · reembolso < 2% · páginas por cliente/ano > 1,4.

---

## 15. Prompts prontos para o Claude Code

**Abertura do projeto**
> Leia `docs/SPEC.md` inteiro. Confirme que entendeu a arquitetura de blocos em JSON (seção 7.2) e a regra de que preview e página publicada usam o mesmo renderer. Depois implemente a **Fase 0**. Não crie nenhuma tela ainda.

**Fase de motion**
> Leia `docs/SPEC.md` seções 4, 5 e 6, e `docs/MOTION-REFS.md`. Implemente a **Fase 1**. Requisitos rígidos: um único listener de scroll e um único de pointer em toda a aplicação, ambos throttled por requestAnimationFrame, escrevendo CSS custom properties. Nenhum componente pode registrar listener próprio. Todos os componentes de biblioteca precisam ser retematizados com os tokens da seção 4 — nenhuma cor hardcoded. Ao final, crie `/dev/motion` demonstrando cada um.

**Fase do editor**
> Leia `docs/SPEC.md` seções 7.2, 8.4 e 12. Implemente a **Fase 4**. O requisito mais importante é nunca perder o trabalho do usuário: autosave com debounce, recuperação ao voltar, retry no upload. Meça o jank do preview enquanto digito e me mostre o resultado do Profiler.

**Revisão**
> Revise o que acabou de implementar contra a seção 12 (anti-padrões) e a seção 10 (orçamento de performance). Liste o que está violando e corrija antes de commitar.

---

## 16. `CLAUDE.md` (copiar para a raiz do repositório)

```md
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
6. `--color-accent` é dinâmico e muda conforme a **paleta** que a pessoa
   escolhe (`lib/palettes.ts`), nunca conforme uma data. `data-palette` e
   `data-skin` vão no contêiner da página, nunca no `documentElement`.
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
```

---

## Próximo passo

Preencher a seção **6.5** com os links de referência de motion. Para cada link, anotar o efeito exato que você quer, em qual tela ele entra e qual componente do inventário chega mais perto — assim o Claude Code implementa a referência certa em vez de improvisar.
