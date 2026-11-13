"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CandlestickChart, Coins, FlaskConical, Home, PieChart, User, UserRound, Wallet } from "lucide-react";
import { IconeApp, Logo } from "./Logo";
import { AlternarTema } from "./AlternarTema";
import { BotaoSair } from "./BotaoSair";

const PRINCIPAIS = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  { href: "/financas", rotulo: "Finanças", Icone: Wallet },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/simulador", rotulo: "Simulador", Icone: FlaskConical },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
];
const CONTA = [
  { href: "/perfil", rotulo: "Meu perfil", Icone: UserRound },
  { href: "/conta", rotulo: "Conta", Icone: User },
];

// Menu do computador: um trilho fino só com ícones que se abre por cima do conteúdo
// ao passar o mouse (ou ao navegar pelo teclado), mostrando os nomes.
export function BarraLateral({ saldo, nivel, nome }: { saldo: number; nivel: string; nome: string }) {
  const caminho = usePathname();
  const item = ({ href, rotulo, Icone }: (typeof PRINCIPAIS)[number]) => {
    const ativo = caminho.startsWith(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={ativo ? "page" : undefined}
          title={rotulo}
          className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
            ativo ? "bg-ciano/12 font-semibold text-texto" : "font-medium text-suave hover:bg-superficie-2 hover:text-texto"
          }`}
        >
          {ativo ? <span className="absolute -left-2.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-ciano" aria-hidden="true" /> : null}
          <Icone className={`h-5 w-5 shrink-0 ${ativo ? "text-ciano" : ""}`} strokeWidth={ativo ? 2.25 : 1.75} aria-hidden="true" />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/menu:opacity-100 group-focus-within/menu:opacity-100">{rotulo}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className="group/menu fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col overflow-hidden border-r border-linha bg-superficie px-2.5 py-4 transition-[width,box-shadow] duration-200 ease-out hover:w-60 hover:shadow-[12px_0_40px_-16px_rgb(20_51_82/0.35)] focus-within:w-60 lg:flex">
      <Link href="/inicio" aria-label="Início" className="flex h-11 items-center px-1.5">
        <IconeApp className="h-8 w-8 shrink-0 group-hover/menu:hidden group-focus-within/menu:hidden" />
        <span className="hidden group-hover/menu:block group-focus-within/menu:block">
          <Logo />
        </span>
      </Link>

      <nav aria-label="Navegação principal" className="mt-6 flex flex-1 flex-col justify-between">
        <ul className="flex flex-col gap-1">{PRINCIPAIS.map(item)}</ul>
        <ul className="flex flex-col gap-1">{CONTA.map(item)}</ul>
      </nav>

      <div className="mt-3 flex flex-col gap-1 border-t border-linha pt-3">
        <Link href="/aprender#coins" title={`${saldo} coins · nível ${nivel}`} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-superficie-2">
          <Coins className="h-5 w-5 shrink-0 text-gravata" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 whitespace-nowrap opacity-0 transition-opacity group-hover/menu:opacity-100 group-focus-within/menu:opacity-100">
            <span className="font-semibold tabular-nums text-texto">{saldo.toLocaleString("pt-BR")}</span>
            <span className="text-xs text-suave">nível {nivel}</span>
          </span>
        </Link>
        <div className="flex h-12 items-center gap-2 px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-superficie-2 font-display text-sm font-semibold text-texto" title={nome} aria-hidden="true">
            {(nome || "?").charAt(0).toUpperCase()}
          </span>
          <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-1.5 opacity-0 transition-opacity group-hover/menu:pointer-events-auto group-hover/menu:opacity-100 group-focus-within/menu:pointer-events-auto group-focus-within/menu:opacity-100">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-texto">{nome || "Sua conta"}</span>
            <AlternarTema />
            <BotaoSair />
          </span>
        </div>
      </div>
    </aside>
  );
}
