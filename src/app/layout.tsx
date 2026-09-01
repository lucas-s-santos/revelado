import type { Metadata, Viewport } from "next";
import { DM_Mono, Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { Analytics } from "@/components/analytics";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

/* SPEC 4.2 — três papéis tipográficos. display: 'swap' e variable em todos.
 *
 * As três trocaram (Instrument Serif / Inter / JetBrains Mono saíram). O que
 * NÃO muda é o contrato: o resto do CSS só conhece --font-display,
 * --font-sans e --font-mono, que são papéis. Nenhuma regra sabe o nome da
 * fonte, e é por isso que esta troca cabe num arquivo só.
 */

/* Fraunces é variável de verdade: além do peso ela tem opsz (tamanho óptico),
 * SOFT (arredondamento dos terminais) e WONK (as formas "tortas", que é de
 * onde vem o charme dela). Sem declarar os eixos aqui o next/font baixa só a
 * instância padrão e font-variation-settings no CSS não teria o que mexer. */
const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/* O papel numérico continua existindo (contador, eyebrow, preço): dígito que
 * não pula a cada segundo. Só saiu da mão de uma fonte de programador para
 * uma que combina com o resto — mono é sempre tabular por construção. */
const mono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Revelado — páginas de casal com QR Code",
    template: "%s · Revelado",
  },
  description:
    "Monte a página de vocês dois com fotos, carta, música e o contador correndo desde o primeiro dia. Pague uma vez via Pix e receba link + QR Code para imprimir e entregar em mãos.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  // Barra do navegador no celular: acompanha o fundo da pele clara.
  // É o mesmo valor de --color-bg em theme.css — estava #FFF8F5, com os dois
  // últimos pares trocados, e a barra saía num creme que a página não tem.
  themeColor: "#FFF5F8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* As classes do next/font vão no <html>, NÃO no <body>.
     *
     * Isto não é preferência: era um bug que deixava o site inteiro em fonte
     * de sistema. O `@theme` do Tailwind declara os papéis no `:root`, ou seja,
     * no <html>:
     *
     *   :root { --font-sans: var(--font-jakarta), ui-sans-serif, ...; }
     *
     * A substituição de uma custom property acontece no elemento **que a
     * declara**. Com `--font-jakarta` definida só no <body>, o `var()` ali em
     * cima não tinha o que resolver: `--font-sans` virava inválida no :root e
     * o <body> herdava o vazio. Resultado: `font-family: var(--font-sans)`
     * caía na pilha do sistema e nem Inter nem Instrument Serif jamais
     * apareceram na tela — só o fallback do navegador.
     *
     * Com as classes aqui, quem declara e quem consome são o mesmo elemento. */
    <html
      lang="pt-BR"
      className={cn(display.variable, sans.variable, mono.variable)}
    >
      {/* Sem data-skin nem data-palette: a landing e o editor são sempre a
          pele clara, e o padrão de `--color-accent` já é a framboesa da marca.
          Quem sobrescreve os dois é a página publicada, pelo conteúdo. */}
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
