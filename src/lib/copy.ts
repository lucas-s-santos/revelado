/**
 * Textos da interface — SPEC 12: "textos da UI em pt-BR, centralizados em
 * lib/copy.ts desde o início (facilita o espanhol na fase 4)".
 *
 * Voz (SPEC 11): verbos ativos, frases curtas, tom conversacional. Erro explica
 * o que houve e o que fazer. Tela vazia é convite, não recado triste.
 */

export const copy = {
  brand: {
    name: "Revelado",
    tagline: "Páginas comemorativas com QR Code",
  },

  nav: {
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Ocasiões", href: "#ocasioes" },
      { label: "Preços", href: "#precos" },
      { label: "Perguntas", href: "#perguntas" },
    ],
    cta: "Criar minha página",
    login: "Entrar",
  },

  promo: {
    prefix: "Dia dos Pais",
    suffix: "para imprimir e entregar em mãos",
    dismiss: "Fechar aviso",
  },

  hero: {
    eyebrow: "presente digital com QR Code",
    titleLead: "Um presente que",
    titleAccent: "revela",
    titleTail: "a história de vocês",
    lede: "Monte uma página com as fotos, a mensagem e a música de vocês. Pague uma vez no Pix e receba o link com o QR Code para imprimir e presentear.",
    cta: "Criar minha página",
    secondary: "Ver um exemplo",
    socialPrefix: "já foram criadas",
    socialSuffix: "páginas",
    noLogin: "Sem cadastro para começar · você só paga no fim",
  },

  phone: {
    counterLabel: "juntos há",
    letter: "Cada dia com você virou minha parte favorita do dia.",
    qrHint: "aponte a câmera",
  },

  marquee: {
    eyebrow: "para qualquer data que importa",
  },

  how: {
    eyebrow: "como funciona",
    title: "Três passos, oito minutos",
    lede: "Sem programa para instalar, sem cadastro para começar.",
    acts: [
      {
        eyebrow: "passo um",
        title: "Escolha a ocasião",
        text: "Namoro, aniversário, Dia das Mães, casamento. Cada ocasião já vem com o clima certo — cores, blocos e textos sugeridos.",
      },
      {
        eyebrow: "passo dois",
        title: "Monte a página",
        text: "Suba as fotos, escreva a mensagem, escolha a música e marque a data do contador. O preview do celular atualiza enquanto você digita.",
      },
      {
        eyebrow: "passo três",
        title: "Pague e presenteie",
        text: "Pix confirmado na hora. Você recebe o link, o QR Code em PNG e um cartão A6 em PDF, pronto para imprimir em casa.",
      },
    ],
  },

  occasions: {
    eyebrow: "oito ocasiões",
    title: "Para a data que você quer marcar",
    lede: "Passe o ponteiro: a página muda de cor junto com a ocasião.",
    cta: "Começar por essa",
  },

  revelation: {
    eyebrow: "a revelação",
    title: "As fotos aparecem como no laboratório",
    lede: "Quem abre o seu link vê as fotos revelando conforme rola a página. É o efeito que faz a pessoa parar e olhar até o fim.",
  },

  pricing: {
    eyebrow: "preços",
    title: "Pague uma vez. Sem mensalidade.",
    lede: "Escolha pelo tanto de foto que você quer colocar.",
    highlight: "mais escolhido",
    perYear: "por 1 ano no ar",
    forever: "para sempre",
    bumpLabel: "Deixar minha página no ar para sempre",
    bumpHint: "sem renovação, sem prazo",
    totalLabel: "total",
    cta: "Criar minha página",
    guarantee: "7 dias de garantia. Não gostou, devolvemos o valor.",
  },

  testimonials: {
    eyebrow: "quem já presenteou",
    title: "O que acontece quando a pessoa abre",
    items: [
      {
        quote:
          "Imprimi o QR e colei dentro de um cartão. Ela escaneou na mesa do restaurante e chorou antes da segunda foto.",
        author: "Marina",
        detail: "3 anos de namoro",
      },
      {
        quote:
          "Fiz para minha mãe no Dia das Mães com fotos que ela nunca tinha visto digitalizadas. Ela mostrou para a família toda no grupo.",
        author: "Rafael",
        detail: "Dia das Mães",
      },
      {
        quote:
          "Usei nas mesas do casamento. Os convidados escanearam e deixaram recado no mural. Ficou melhor que livro de assinaturas.",
        author: "Bia e Téo",
        detail: "Casamento, 120 convidados",
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
        q: "Como a pessoa abre a página?",
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
        a: "Ela não aparece no Google, e o endereço tem um trecho aleatório que ninguém adivinha. Se quiser, coloque uma senha.",
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
    eyebrow: "última chamada",
    title: "Comece pela foto que você já tem no celular",
    lede: "Em oito minutos existe uma página que só vocês dois têm.",
    cta: "Criar minha página",
  },

  footer: {
    tagline:
      "Páginas comemorativas com QR Code. Feito no Brasil, para presentear em mãos.",
    columns: [
      {
        title: "Produto",
        links: [
          { label: "Como funciona", href: "#como-funciona" },
          { label: "Ocasiões", href: "#ocasioes" },
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

  units: {
    years: "anos",
    months: "meses",
    days: "dias",
    hours: "horas",
    minutes: "min",
    seconds: "seg",
    yearsShort: "a",
    monthsShort: "m",
    daysShort: "d",
    hoursShort: "h",
    minutesShort: "min",
    secondsShort: "s",
  },
} as const;
