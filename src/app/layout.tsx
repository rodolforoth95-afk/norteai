import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

// Geist em títulos e textos (grotesca limpa, pesos intermediários); Geist Mono em números
// técnicos; Nunito só no logotipo, para manter o desenho da marca.
const texto = Geist({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const marca = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata: Metadata = {
  title: { default: "Findomo — seu mordomo das finanças", template: "%s · Findomo" },
  description:
    "Pode perguntar. Estou aqui pra isso. Um mordomo com IA que explica, compara e simula, sem vender nenhum produto.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Findomo",
    title: "Findomo — seu mordomo das finanças",
    description: "Pode perguntar. Estou aqui pra isso. Aprenda a investir, acompanhe o mercado e sua carteira, sem vender produtos.",
  },
  applicationName: "Findomo",
  appleWebApp: { capable: true, title: "Findomo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060a1c" },
    { media: "(prefers-color-scheme: light)", color: "#060a1c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tema salvo pelo alternador (padrão: noite, o visual principal do app).
  const tema = (await cookies()).get("tema")?.value === "claro" ? "claro" : "escuro";
  return (
    <html lang="pt-BR" data-tema={tema}>
      <body className={`${texto.variable} ${mono.variable} ${marca.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
