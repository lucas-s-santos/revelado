/**
 * Textos da interface — SPEC 12: "textos da UI em pt-BR, centralizados em
 * lib/copy.ts desde o início (facilita o espanhol na fase 4)".
 *
 * Voz (SPEC 11): verbos ativos, frases curtas, tom conversacional. Erro explica
 * o que houve e o que fazer. Tela vazia é convite, não recado triste.
 *
 * O produto é um só — a página que uma pessoa faz para a outra. Nada aqui fala
 * em "ocasião", "para qualquer data" ou "para quem você ama": é sempre
 * **vocês dois**. Texto genérico foi o que a gente tirou no pivô; se voltar,
 * volta o produto genérico junto.
 */

// Os rótulos de unidade moram em `lib/units.ts`, num módulo próprio: a página
// publicada importa só eles, sem arrastar os textos da landing (ver o comentário
// lá). Aqui ficam reexportados para a centralização da SPEC 12 continuar valendo.
import { units } from "@/lib/units";

export { units };

import { portalText } from "@/lib/portal-text";

export const copy = {
  units,

  brand: {
    name: "Revelado",
    tagline: "Páginas de casal com QR Code",
  },

  nav: {
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "O que vai dentro", href: "#blocos" },
      { label: "Preços", href: "#precos" },
      { label: "Perguntas", href: "#perguntas" },
    ],
    cta: "Criar nossa página",
    login: "Entrar",
  },

  promo: {
    prefix: "Dia dos Namorados",
    suffix: "para imprimir e entregar em mãos",
    dismiss: "Fechar aviso",
  },

  hero: {
    eyebrow: "presente de casal com QR Code",
    titleLead: "Uma página que",
    titleAccent: "revela",
    titleTail: "a história de vocês dois",
    lede: "Fotos, carta, música e o contador desde o primeiro dia. Um Pix, e o QR Code chega pronto para imprimir.",
    cta: "Criar nossa página",
    secondary: "Ver a página da Marina e do Téo",
    socialSuffix: "páginas já reveladas",
    noLogin: "sem cadastro, você só paga no fim",
  },

  phone: {
    counterLabel: "juntos há",
    letter: "Cada dia com você virou minha parte favorita do dia.",
    qrHint: "aponte a câmera",
  },

  marquee: {
    eyebrow: "para qualquer data de vocês",
  },

  // Os três selos abaixo do mockup. Nenhum deles é nota de avaliação nem
  // contagem de vendas: prova social inventada é alegação falsa, e o que a
  // gente tem de verdade para dizer aqui já é bom — o preview é grátis, o
  // pagamento é um só e a página sai pronta.
  /* O primeiro frame da página publicada. Mora em `lib/portal-text.ts` e é
     reexportado aqui: a página publicada importa a folha, para não arrastar
     este arquivo inteiro para o bundle dela (ver o comentário de lá). */
  portal: portalText,

  showcase: {
    demoLabel: "A página de exemplo do Revelado, rodando dentro do celular",
    demoWake: "tocar para explorar",
    eyebrow: "veja antes de decidir",
    title: "É isto que ela vai abrir.",
    // Antes começava pela instrução ("toque... e role"), e só depois vinha o
    // motivo para confiar. Invertido: primeiro a promessa (é a página de
    // verdade, sem corte), depois o convite a agir — confiança antes de
    // pedir o gesto, não o contrário.
    lede: "A mesma página que ela vai receber, sem cortar nada. Toque no celular e role até o fim.",
    badges: [
      {
        id: "rapido",
        name: "Pronta em minutos",
        text: "Você monta, vê no celular e ajusta na hora.",
      },
      {
        id: "preview",
        name: "O preview é grátis",
        text: "Inteiro, sem cortar nada. Você só paga para publicar.",
      },
      {
        id: "pagamento",
        name: "Um pagamento só",
        text: "Sem assinatura, sem cobrança que volta no mês seguinte.",
      },
    ],
  },

  reaction: {
    eyebrow: "não é só uma página",
    titleLead: "O presente que ela vai",
    titleAccent: "abrir mais de uma vez.",
    lede: "Você manda um link. Do outro lado, alguém guarda esse link.",
    bullets: [
      "Feita com a história de vocês, do começo até agora",
      "Abre em qualquer celular, sem instalar nada",
      "Vai por link ou por QR Code impresso, na mão",
    ],
    // Conversa ilustrativa: é demonstração de produto, não depoimento. Nada
    // aqui se apresenta como mensagem de cliente real.
    chat: {
      contact: "Amor",
      status: "online",
      demoLabel: "conversa ilustrativa",
      messages: [
        { id: "m1", from: "eu", text: "fiz uma coisa pra você" },
        { id: "m2", from: "eu", text: "abre com calma", link: "revelado.com.br/nos" },
        { id: "m3", from: "ela", text: "que isso… eu não esperava" },
      ],
    },
  },

  create: {
    lede: "Sua página já nasce montada, com capa, contador, galeria e carta. Você troca o que quiser e vê no celular na hora.",
    cta: "Começar agora",
  },

  how: {
    eyebrow: "como funciona",
    title: "Três passos, oito minutos",
    lede: "Sem programa para instalar, sem cadastro para começar.",
    acts: [
      {
        eyebrow: "passo um",
        title: "Escolha as fotos",
        text: "Aquelas que já estão no seu celular. Arraste para ordenar e escreva uma legenda em quem merece.",
      },
      {
        eyebrow: "passo dois",
        title: "Monte a página",
        text: "Escreva a carta, escolha a música de vocês e marque a data do primeiro dia. O contador começa a rodar e o preview atualiza enquanto você digita.",
      },
      {
        eyebrow: "passo três",
        title: "Imprima e entregue",
        text: "Pix confirmado na hora. Você recebe o link, o QR Code em PNG e um cartão A6 em PDF, pronto para imprimir em casa.",
      },
    ],
  },

  // Quatro em destaque, com tom e prévia próprios; o resto numa linha
  // compacta. O produto continua tendo oito blocos — o que muda é que a
  // landing para de listar tudo com o mesmo peso e mostra os quatro que
  // vendem a página.
  blocks: {
    eyebrow: "o que vai dentro",
    title: "Cada pedaço é uma lembrança.",
    lede: "Todos vêm montados. Você tira, põe e arrasta na ordem que quiser.",
    featured: [
      {
        id: "counter",
        tone: "rose",
        name: "Contador ao vivo",
        text: "Anos, meses, dias e os segundos correndo desde o dia em que vocês começaram.",
        digits: [
          { value: "04", label: "anos" },
          { value: "08", label: "meses" },
          { value: "19", label: "dias" },
        ],
      },
      {
        id: "gallery",
        tone: "lilac",
        name: "Galeria",
        text: "Carrossel, grade, polaroide ou pilha. As fotos revelam conforme a pessoa rola.",
      },
      {
        id: "music",
        tone: "cream",
        name: "A música de vocês",
        text: "A faixa do Spotify ou do YouTube que toca quando a pessoa aperta o play.",
      },
      {
        id: "letter",
        tone: "deep",
        name: "A carta",
        text: "O texto longo que você não conseguiria falar olhando nos olhos. Com assinatura no fim.",
        quote: "Tem coisa que eu só consigo escrever.",
      },
    ],
    moreLabel: "e ainda vêm junto",
    more: [
      { id: "timeline", name: "Linha do tempo" },
      { id: "reasons", name: "Motivos" },
      { id: "capsule", name: "Cápsula do tempo" },
      { id: "map", name: "O lugar" },
    ],
  },

  // A quebra escura da landing. Tudo em volta é claro; esta seção é a única
  // que respira no escuro, e é ela que segura o envelope.
  revelation: {
    eyebrow: "uma prévia da emoção",
    titleLead: "Não conte o que é.",
    titleAccent: "Deixa ela descobrir.",
    lede: "Abre o envelope e veja o que aparece do outro lado do link — antes mesmo de você dizer qualquer coisa.",
    closedHint: "toque para abrir",
    openHint: "é isto que ela vê primeiro",
    open: "Abrir o envelope",
    close: "Fechar o envelope",
    peek: "Nossa história começou numa terça que não tinha nada de especial.",
  },

  // Ocupa o lugar do "nós contra as outras plataformas". Comparar com
  // concorrente exige verificar o produto dele; ninguém verifica, e a tabela
  // vira alegação solta. A dúvida de quem chegou aqui é qual dos dois levar.
  comparison: {
    eyebrow: "lado a lado",
    title: "Qual dos dois é o de vocês?",
    lede: "A página é a mesma nos dois. O que muda é quanto tempo ela fica e o que cabe dentro.",
    columns: { simples: "1 Dia", especial: "Eterno" },
    yes: "incluído",
    no: "não incluído",
  },

  // Dois planos. O barato é de impulso: sai por menos que um buquê e vale um
  // dia — quem quiser guardar sobe para o Eterno, pela diferença exata.
  //
  // `perYear` saiu: era string fixa dizendo "por 1 ano no ar" para qualquer
  // plano com prazo, e virou mentira no dia em que o prazo mudou. O rótulo
  // agora sai da duração real do plano (ver `durationLabel` em plans.ts).
  pricing: {
    eyebrow: "preços · a partir de R$ 19,90",
    title: "Quanto vale a cara que ela vai fazer?",
    lede: "Menos que um buquê, e não murcha em três dias. Um pagamento só, sem assinatura.",
    highlight: "mais escolhido",
    forever: "pagamento único",
    badges: ["Pix na hora", "Cartão em até 12x", "Sem mensalidade"],
    bumpLabel: "Deixar nossa página no ar para sempre",
    bumpHint: "vira o Eterno, pela diferença exata",
    totalLabel: "total",
    cta: "Criar nossa página",
    guarantee: "7 dias de garantia. Não gostou, devolvemos o valor.",
  },

  // NÃO são depoimentos. Eram três citações com nome e atribuição — pessoas
  // que não existem dizendo que gostaram —, e isso é alegação falsa, não
  // copy. Viraram cenas identificadas como ilustração, que ainda por cima
  // explicam os três modos de entrega: QR impresso, link e a música.
  //
  // Quando houver depoimento de gente real, com permissão, ele entra aqui com
  // nome de verdade e esta seção troca de rótulo.
  mood: {
    eyebrow: "de perto",
    title: "O que fica na mão",
    lede: "Três cenas soltas, sem gente — só o clima. Toque para ver cada uma se mexer.",
    demoLabel: "cena ilustrativa",
    items: [
      { id: "telefone", tag: "a tela, de noite" },
      { id: "fotos", tag: "o que fica guardado" },
      { id: "qrcode", tag: "o cartão, na mão" },
    ],
  },

  testimonials: {
    eyebrow: "como a página chega",
    title: "O momento em que ela abre.",
    lede: "Três cenas do que o formato faz. Cada uma é uma forma de entregar.",
    demoLabel: "cena ilustrativa",
    items: [
      {
        id: "qr",
        tag: "QR impresso",
        scene:
          "O código colado dentro de um cartão de papel. Ela aponta a câmera na mesa do restaurante e a primeira foto aparece antes de você explicar o que é.",
      },
      {
        id: "link",
        tag: "link no WhatsApp",
        scene:
          "O link no meio de uma conversa, num dia comum, sem data nenhuma. Do outro lado, meia hora passando as fotos para cima e para baixo.",
      },
      {
        id: "musica",
        tag: "a música de vocês",
        scene:
          "A faixa do primeiro encontro começa sozinha quando a página abre. Reconhecida nos três primeiros segundos, antes de qualquer texto.",
      },
    ],
  },

  faq: {
    eyebrow: "perguntas",
    title: "O que costumam perguntar",
    items: [
      {
        q: "Preciso criar conta para montar a página?",
        a: "Não. Você monta a página inteira sem cadastro e só informa o e-mail no pagamento — é onde a sua conta nasce, para você poder editar depois.",
      },
      {
        q: "Como ela abre a página?",
        a: "Pelo link ou apontando a câmera do celular para o QR Code. Funciona em qualquer celular, sem instalar nada.",
      },
      {
        q: "Posso editar depois de publicar?",
        a: "Sim, quantas vezes quiser. O endereço da página nunca muda, então o QR que você imprimiu continua valendo.",
      },
      {
        q: "Que música posso colocar?",
        a: "Qualquer faixa do Spotify ou do YouTube. A música toca pelo player oficial deles, direto da plataforma.",
      },
      {
        q: "A página fica pública na internet?",
        a: "Ela não aparece no Google, e o endereço tem um trecho aleatório que ninguém adivinha. Se quiser, coloque uma senha e mande junto com o presente.",
      },
      {
        q: "Serve só para namoro?",
        a: "Serve para vocês dois em qualquer fase: um mês, dez anos, noivado, bodas, reconciliação. O contador conta desde a data que você marcar, ou até ela.",
      },
      {
        q: "Quanto tempo leva para ficar pronta?",
        a: "A maioria das pessoas termina em menos de oito minutos. Se precisar parar no meio, o rascunho fica salvo.",
      },
      {
        q: "E se eu não gostar?",
        a: "Você tem 7 dias para pedir o dinheiro de volta. Escreve para a gente e devolvemos, sem formulário e sem enrolação.",
      },
    ],
  },

  finalCta: {
    eyebrow: "começa com uma foto que você já tem",
    titleLead: "Essa página ainda não existe.",
    titleAccent: "Depende de você.",
    lede: "Em oito minutos ela está no ar, com link e QR Code prontos para imprimir. Você só paga quando decidir publicar.",
    cta: "Criar nossa página",
    note: "Sem cadastro para começar",
  },

  footer: {
    tagline:
      "Páginas de casal com QR Code. Feito no Brasil, para presentear em mãos.",
    columns: [
      {
        title: "Produto",
        links: [
          { label: "Como funciona", href: "#como-funciona" },
          { label: "O que vai dentro", href: "#blocos" },
          { label: "Preços", href: "#precos" },
        ],
      },
      {
        title: "Ajuda",
        links: [
          { label: "Perguntas frequentes", href: "#perguntas" },
          { label: "Falar com a gente", href: "mailto:ola@revelado.com.br" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Termos de uso", href: "/termos" },
          { label: "Privacidade", href: "/privacidade" },
        ],
      },
    ],
    rights: "Todos os direitos reservados.",
  },
} as const;
