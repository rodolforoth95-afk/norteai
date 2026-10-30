"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CandlestickChart, Coins, Home, PieChart, User, UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { AlternarTema } from "./AlternarTema";
import { BotaoSair } from "./BotaoSair";

const ITENS = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
  { href: "/perfil", rotulo: "Meu perfil", Icone: UserRound },
  { href: "/conta", rotulo: "Conta", Icone: User },
];

// Menu lateral da versão para computador (a barra inferior fica só no celular).
export function BarraLateral({ saldo, nivel, nome }: { saldo: number; nivel: string; nome: string }) {
  const caminho = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-linha bg-superficie px-4 py-6 lg:flex">
      <Link href="/inicio" aria-label="Início" className="px-2">
        <Logo />
      </Link>

      <nav aria-label="Navegação principal" className="mt-8 flex-1">
        <ul className="flex flex-col gap-1">
          {ITENS.map(({ href, rotulo, Icone }) => {
            const ativo = caminho.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    ativo ? "bg-violeta/12 text-texto" : "text-suave hover:bg-superficie-2 hover:text-texto"
                  }`}
                >
                  <span className={`h-5 w-1 rounded-full ${ativo ? "gradiente-marca" : "bg-transparent"}`} aria-hidden="true" />
                  <Icone className={`h-5 w-5 ${ativo ? "text-ciano" : ""}`} aria-hidden="true" />
                  {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3">
        <Link href="/aprender#coins" className="rounded-2xl border border-ambar/30 bg-ambar/10 p-3">
          <span className="flex items-center gap-2 text-sm font-bold text-ambar">
            <Coins className="h-4 w-4" aria-hidden="true" />
            {saldo} coins
          </span>
          <span className="mt-0.5 block text-xs text-suave">Nível {nivel}</span>
        </Link>
        <AlternarTema comRotulo />
        <BotaoSair comRotulo />
        {nome ? <p className="truncate px-1 text-xs text-suave">Conectado como {nome}</p> : null}
      </div>
    </aside>
  );
}
