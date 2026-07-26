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
    default: "Revelado — páginas comemorativas com QR Code",
    template: "%s · Revelado",
  },
  description:
    "Monte uma página com fotos, mensagem, música e contador ao vivo. Pague uma vez via Pix e receba link + QR Code para imprimir e presentear.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  themeColor: "#0A0711",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={cn(display.variable, sans.variable, mono.variable)}
        data-occasion="aniversario"
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
