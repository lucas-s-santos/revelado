import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

import { Analytics } from "@/components/analytics";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

// SPEC 4.2 — três papéis tipográficos. display: 'swap' e variable em todos.
const display = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
  themeColor: "#FFF8F5",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      {/* Sem data-skin nem data-palette: a landing e o editor são sempre a
          pele clara, e o padrão de `--color-accent` já é a framboesa da marca.
          Quem sobrescreve os dois é a página publicada, pelo conteúdo. */}
      <body className={cn(display.variable, sans.variable, mono.variable)}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
