"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CandlestickChart, Coins, FlaskConical, Home, PieChart, User, UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { AlternarTema } from "./AlternarTema";
import { BotaoSair } from "./BotaoSair";

const ITENS = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/simulador", rotulo: "Simulador", Icone: FlaskConical },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
  { href: "/perfil", rotulo: "Meu perfil", Icone: UserRound },
  { href: "/conta", rotulo: "Conta", Icone: User },
];

// Menu lateral da versão para computador (a barra inferior fica só no celular).
export function BarraLateral({ saldo, nivel, nome }: { saldo: number; nivel: string; nome: string }) {
  const caminho = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-linha bg-superficie px-3 py-5 lg:flex">
      <Link href="/inicio" aria-label="Início" className="px-3">
        <Logo />
      </Link>

      <nav aria-label="Navegação principal" className="mt-7 flex-1">
        <ul className="flex flex-col gap-0.5">
          {ITENS.map(({ href, rotulo, Icone }) => {
            const ativo = caminho.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                    ativo ? "bg-superficie-2 font-semibold text-texto" : "font-medium text-suave hover:bg-superficie-2/70 hover:text-texto"
                  }`}
                >
                  <Icone className={`h-[18px] w-[18px] ${ativo ? "text-ciano" : ""}`} strokeWidth={ativo ? 2.25 : 1.75} aria-hidden="true" />
                  {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link href="/aprender#coins" className="mx-1 mb-3 flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-superficie-2">
        <span className="flex items-center gap-2 font-semibold tabular-nums text-texto">
          <Coins className="h-4 w-4 text-gravata" aria-hidden="true" />
          {saldo.toLocaleString("pt-BR")} coins
        </span>
        <span className="text-xs text-suave">nível {nivel}</span>
      </Link>
      <div className="flex items-center gap-2 border-t border-linha px-1 pt-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-superficie-2 font-display text-sm font-extrabold text-texto" aria-hidden="true">
          {(nome || "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-texto">{nome || "Sua conta"}</span>
          <Link href="/conta" className="block text-xs text-suave hover:text-texto">
            Minha conta
          </Link>
        </span>
        <AlternarTema />
        <BotaoSair />
      </div>
    </aside>
  );
}
