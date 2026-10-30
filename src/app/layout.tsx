import type { Metadata, Viewport } from "next";
import { Barlow, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
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
  title: { default: "Norte.ia — seu dinheiro com direção", template: "%s · Norte.ia" },
  description:
    "Um guia com IA que explica, compara e simula. Sem vender nenhum produto.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Norte.ia",
    title: "Norte.ia — seu dinheiro com direção",
    description: "Aprenda a investir, acompanhe o mercado e sua carteira. Conteúdo educacional, sem vender produtos.",
  },
  applicationName: "Norte.ia",
  appleWebApp: { capable: true, title: "Norte.ia", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f2" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tema salvo pelo alternador (padrão: escuro, a identidade principal da marca).
  const tema = (await cookies()).get("tema")?.value === "claro" ? "claro" : "escuro";
  return (
    <html lang="pt-BR" data-tema={tema}>
      <body className={`${titulo.variable} ${texto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
