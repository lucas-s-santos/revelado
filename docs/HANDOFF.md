# Estado do projeto — 21/08/2026

Ponto de retomada. `docs/SPEC.md` continua sendo a fonte de verdade do
produto; este documento diz **onde paramos** e **o que decidimos**, para
ninguém re-litigar amanhã o que já foi decidido hoje.

---

## 1. A decisão desta sessão

O produto passa a espelhar, seção por seção, um concorrente direto de
páginas-presente — a estrutura de funil, a ordem das seções da landing e o
formato do editor. Duas coisas **não** vieram junto, por decisão explícita:

| O concorrente faz | Nós continuamos | Por quê |
|---|---|---|
| Landings por relação (`/amizade`, `/pai`) | Sem ramificação por relação | É o modelo de ocasiões removido na v2 do SPEC |
| "Passo 1: crie sua conta" | Sem cadastro antes do editor | Regra 8 — fricção antes do preview derruba conversão |

**O que não copiamos, e não é negociável:** nome, logo, mascote e textos
literais do concorrente são material autoral deles. Estrutura e funil se
copiam à vontade; marca não. E nenhum número de prova social que a gente não
tenha de verdade — nota de avaliação, contagem de vendas e prints de
terceiros ficam de fora até existirem de fato.

---

## 2. Feito nesta sessão

### Fase A — a pele (completa)

- **`scripts/check-contrast.mjs`** (novo) — mede WCAG 2.1 em 22 pares reais
  da interface, lendo os tokens direto do `theme.css`. Falha o processo se
  algum par cair abaixo do mínimo. Roda com `pnpm contrast`.
- **`src/styles/theme.css`** — repintado: fundo `#FFF5F8`, tinta `#1A1230`,
  seção vinho `#2C0A1B`, quatro tons de card. A pele escura continua
  intacta como escolha de quem monta a página.

> **Achado que virou decisão:** o rosa `#FF2E93` com texto branco dá
> **3.48:1** e reprova nos 4.5:1. O rosa de preenchimento é `#E01B7A`
> (**4.56:1**); o vivo virou `--color-brand-bright`, usado só em brilho e
> gradiente, **nunca atrás de texto**.

### Fase B — a landing (parcial)

- **`phone-showcase.tsx`** (novo) — o mockup saiu do hero, onde dividia a
  dobra com o h1 e chegava pequeno demais para ler, e virou seção própria
  com os três selos.
- **`reaction.tsx`** (novo) — mostra o formato em que a página chega. A
  conversa é ilustração de produto e se identifica como tal na interface.
- **`hero.tsx`** — centralizado, sem o mockup. Só texto e ação.
- **`page.tsx`** — nova ordem: Hero → PhoneShowcase → Revelation →
  Reaction → BlocksGrid → HowItWorks → Testimonials → Pricing → Faq →
  FinalCta.

### Fora de fase: o eslint estava mentindo

`pnpm lint` vinha saindo **verde sem verificar nada** — o eslint abortava
porque `eslint-config-next` referencia plugins que o pnpm não hoistou. Uma
vez ligado, apareceram dois erros reais, corrigidos: variável órfã em
`prepare-hero.mjs` e import não usado em `payment-flow.test.ts`. Também saiu
um `aria-hidden` de um `<picture>`, que não aceita ARIA.

---

## 3. Dívidas técnicas — ler antes de retomar

1. **Os plugins do eslint estão ligados por junction dentro de
   `node_modules/`.** Isso **não sobrevive a um `pnpm install`.** A correção
   de verdade é declará-los como devDependency, o que hoje é impossível: o
   store do pnpm aponta para `D:\.pnpm-store\v11`, e o drive está
   inacessível. Enquanto isso não se resolve, um install limpo derruba o
   lint de novo.
2. **`nimbo-3d.png` pesa 1.164KB em 900×960.** O teto do SPEC §10 é 250KB
   para a maior imagem — ele sozinho é 4,6× isso. Precisa de WebP/AVIF em
   dois ou três tamanhos antes de entrar em qualquer tela.
3. **As fotos do hero estão defasadas.** As constantes de cor do
   `prepare-hero.mjs` foram realinhadas com a repintura, mas os arquivos em
   `public/hero-*` ainda são da paleta antiga. Precisam ser regerados.
4. **`moments-marquee.tsx` saiu da landing** mas o arquivo continua no repo.
   Decidir se volta em outro lugar ou se sai de vez.
5. **`TypewriterText` não existe.** O comentário em `letter-block.tsx` dizia
   que a prop `typewriter` era tratada por um componente cliente carregado sob
   demanda. Esse componente nunca foi escrito — a prop está no schema e não faz
   nada. Ou implementa, ou tira do schema.
6. **Lighthouse ainda não medido.** A conferência visual em 375px e 1280px
   passou a ser feita com Playwright contra o dev server: sem rolagem
   horizontal e sem erro de console nos dois. Falta a medição de performance.
7. **Dev server e `next build` disputam o mesmo `.next`.** Rodar os dois ao
   mesmo tempo quebra o build com `Cannot find module for page: /_not-found`
   ou `MODULE_NOT_FOUND`. Encerre o servidor antes de buildar. E `rm -rf
   .next` seguido de build falha na **primeira** tentativa com alguma
   frequência neste drive, sempre passando na segunda — build incremental
   (sem apagar) não tem esse problema.
8. **`/termos` e `/privacidade` não existem.** O rodapé aponta para as duas
   e o Next faz prefetch quando ele entra em tela: dois 404 em toda visita.
   Não é só link quebrado — são páginas que um site que cobra precisa ter.
   O texto é jurídico e específico do negócio, então não inventei nenhum.

---

### Dois formatos estavam quebrados desde a fase 3

"Motivos" pede o bloco `reasons` e "Cápsula do tempo" pede `capsule`. Os dois
estão no registry como `ready: false`, e **o renderer ignora bloco sem
componente em silêncio** — sem erro, sem aviso. Quem escolhesse esses
formatos receberia uma página sem a peça principal.

O editor agora filtra por `isTemplateReady(template, readyBlockTypes)`, que é
dado e não lista à mão: no dia em que `reasons` e `capsule` ganharem
componente, os formatos voltam a aparecer sozinhos. O teste em
`templates.test.ts` trava os dois lados e **falha de propósito** nesse dia —
é o lembrete para mover os ids de um caso para o outro.

A lição geral: `ready: false` no registry não impede nada por si só. Qualquer
lugar que ofereça blocos precisa filtrar.

### Formato é prop, não bloco novo

A referência vende "Carta de Amor" e "Carta Interativa" como produtos
distintos. Aqui os dois são a **mesma carta** com `reveal` diferente
(`plain` | `envelope`) — mesmo texto, mesma assinatura.

O motivo não é economia de código: como blocos separados, trocar de formato
trocaria de bloco e **levaria junto o texto já escrito**. Num editor cujo
requisito acima de todos é nunca perder o trabalho, isso não se paga.

Vale para os formatos que ainda faltam: antes de criar bloco novo, pergunte
se o conteúdo é o mesmo. Se for, é prop.

Duas consequências práticas:

- **Prop nova em bloco existente precisa de default e de teste do default.**
  Sem isso, todo conteúdo já salvo muda de comportamento sozinho.
- **Construção literal de bloco** (`fixtures.ts`, `defaults.ts`) não recebe o
  default do zod: o tipo de saída exige o campo, e o typecheck cobra.

### Bloco opcional precisa de porta de entrada E de saída

`music` e `timeline` **não** entram no rascunho novo, e não podem entrar:
`validateForPublish` exige faixa escolhida e ao menos uma data quando o bloco
existe, então incluí-los no preset faria todo rascunho nascer inválido para
publicar.

A consequência é que o passo do editor precisa de **duas** ações: adicionar
o bloco quando ele não existe, e removê-lo. Só a primeira não basta — um
bloco vazio trava a publicação e a pessoa fica presa nele.

Quem faz isso é `addBlock`/`removeBlock` no store, e `optionalBlock()` em
`lib/blocks/defaults.ts` guarda as props padrão. O bloco entra **antes do
rodapé**, nunca no fim da lista, senão aparece depois da assinatura da página.

O mesmo vale para qualquer bloco opcional novo (mural, cápsula, mapa).

### A régua tem dois pontos cegos — conheça os dois

`pnpm contrast` mede **pares de tokens sólidos**. Ela não vê:

1. **Opacidade aplicada por cima.** Um `opacity: .62` numa peça inteira
   derruba o contraste do texto abaixo do mínimo e a régua continua verde.
   Já aconteceu na grade de temas. Se precisar esmaecer algo, esmaeça a
   decoração, nunca o texto.
2. **Qual classe cai em qual superfície.** Ela mede que `--color-accent`
   funciona sobre `--color-bg`; não sabe que `.display-italic` foi parar
   dentro de um cartão rosa. Foi assim que o CTA saiu ilegível.

Para os dois casos, o que funciona é ler o estilo **computado** no navegador
contra o build de produção.

### Armadilha de cascata — ler antes de mexer em CSS

`.eyebrow` e `.display-italic` moram em **`@layer utilities`**. O CSS das
seções mora em **`@layer components`**, e o Tailwind emite `utilities`
depois. **Camada vence especificidade**: uma regra como
`.final-cta .display-italic` (0,2,0) escrita junto da seção perde para
`.display-italic` (0,1,0). Ela é emitida, aparece no CSS servido e
simplesmente não se aplica — sem erro nenhum avisando.

Toda variante dessas duas classes entra no bloco de `utilities`, logo depois
da classe que ela modifica. Já custou uma seção inteira pintada errada sem
ninguém notar.

### O dev server mente; verifique contra a produção

Ele travou uma vez (1,2 GB, sem responder) e serviu CSS defasado outra, o
que gerou dois diagnósticos errados. Para conferir estilo, use
`next build` + `next start` e leia o estilo **computado** no navegador, não
a olho:

```js
el.evaluate((n) => getComputedStyle(n).color)
```

## 4. O que falta — fases

| Fase | Escopo | Estado |
|---|---|---|
| A | Pele: tokens + régua de contraste | ✅ completa |
| B | Landing seção por seção | ✅ **completa** — Revelation com envelope, BlocksGrid nos 4 tons, cenas de entrega, CTA em cartão rosa |
| C | Editor: passos, barra de %, preview fixo, 12 temas com trava VIP | ✅ **completa** — 12 temas, **dez** passos (o formato virou o primeiro), barra de % |
| D | Formatos novos | 🟡 parcial — carta interativa ✅, passo de escolha de formato ✅; falta o quiz do casal |
| E | Planos reduzidos a 2 · CLAUDE.md e SPEC atualizados para a identidade nova | ⬜ não começada — **mexe em dinheiro** (plans.ts, checkout, seed); pedir aval antes |

### O mascote (decisão pendente)

O vagalume/bonequinho próprio resolve o ponto da marca: mesma função do
mascote deles, sem copiar o personagem. Três ressalvas antes de entrar:

- **Registro emocional.** O mascote do concorrente funciona porque *é* o
  produto — um coração entregando uma carta. Um monstrinho de chifres é
  fofo mas não carrega "acender uma lembrança". Dar um objeto a ele
  (envelope, luz) resolve.
- **Os olhos são furos vazados.** Funcionam sobre fundo escuro; sobre o rosa
  claro viram dois buracos.
- **Seguir o mouse:** só através do `use-pointer.ts` que já existe (regra 3 —
  um único listener no app inteiro). Deve seguir **o olhar**, não o corpo. E
  90% do público é mobile e não tem cursor: sem comportamento para celular,
  é um carinho para 10% da audiência.

---

## 5. Como retomar

```bash
git checkout pivo/identidade-e-landing
corepack pnpm dev          # `pnpm` puro não está no PATH; use corepack

corepack pnpm contrast     # régua de cor — roda antes de aceitar cor nova
npx tsc --noEmit
npx eslint
npx next build
```

O trabalho está no branch **`pivo/identidade-e-landing`**, não no `master`.
Para levar pro master quando quiser:

```bash
git checkout master && git merge pivo/identidade-e-landing && git push
```
