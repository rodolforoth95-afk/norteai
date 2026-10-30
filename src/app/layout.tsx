import type { Metadata, Viewport } from "next";
import { Barlow, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Títulos em Barlow (formas retas e quadradas) e texto em IBM Plex Sans (sóbria, feita para dados).
const titulo = Barlow({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const texto = IBM_Plex_Sans({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Norte.ia",
  description:
    "Um guia com IA que explica, compara e simula. Sem vender nenhum produto.",
  applicationName: "Norte.ia",
  appleWebApp: { capable: true, title: "Norte.ia", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${titulo.variable} ${texto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
