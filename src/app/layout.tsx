import type { Metadata, Viewport } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

// Marca e títulos em Nunito (arredondada e próxima); textos em DM Sans.
const titulo = Nunito({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const texto = DM_Sans({
  variable: "--font-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${titulo.variable} ${texto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
