"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CandlestickChart,
  FlaskConical,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Radar,
  Target,
  ArrowLeftRight,
  User,
  UserRound,
  Wallet,
} from "lucide-react";
import { IconeApp, Logo } from "./Logo";
import { AlternarTema } from "./AlternarTema";
import { BotaoSair } from "./BotaoSair";

const PRINCIPAIS: {
  href: string;
  rotulo: string;
  Icone: typeof Home;
  filhos?: { href: string; rotulo: string; Icone: typeof Home }[];
}[] = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  {
    href: "/financas",
    rotulo: "Finanças",
    Icone: Wallet,
    filhos: [
      { href: "/financas", rotulo: "Acompanhamento", Icone: ArrowLeftRight },
      { href: "/financas/planos", rotulo: "Planos", Icone: Target },
    ],
  },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/simulador", rotulo: "Simulador", Icone: FlaskConical },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
  { href: "/radar", rotulo: "Radar Findomo", Icone: Radar },
];
const CONTA = [
  { href: "/perfil", rotulo: "Meu perfil", Icone: UserRound },
  { href: "/conta", rotulo: "Conta", Icone: User },
];

// Menu do computador: fixado aberto (com nomes) ou recolhido em trilho de ícones.
// Nos dois casos ocupa o próprio espaço e o conteúdo se ajusta, sem ficar por cima.
// A escolha fica no cookie "menu" e no atributo data-menu do <html>.
export function BarraLateral({
  saldo,
  nivel,
  nome,
}: {
  saldo: number;
  nivel: string;
  nome: string;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(true);

  useEffect(
    () => setAberto(document.documentElement.dataset.menu !== "fechado"),
    [],
  );

  function alternar() {
    const novo = !aberto;
    document.documentElement.dataset.menu = novo ? "aberto" : "fechado";
    document.cookie = `menu=${novo ? "aberto" : "fechado"}; path=/; max-age=31536000; samesite=lax`;
    setAberto(novo);
  }

  type Item = {
    href: string;
    rotulo: string;
    Icone: typeof Home;
    filhos?: { href: string; rotulo: string; Icone: typeof Home }[];
  };

  const filhoAtivo = (filhos: NonNullable<Item["filhos"]>, href: string) =>
    caminho.startsWith(href) &&
    !filhos.some(
      (o) =>
        o.href.length > href.length &&
        o.href.startsWith(href) &&
        caminho.startsWith(o.href),
    );

  const item = ({ href, rotulo, Icone, filhos }: Item) => {
    const dentro = caminho.startsWith(href);
    const ativo = dentro && !filhos;
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={ativo ? "page" : undefined}
          title={rotulo}
          className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
            ativo
              ? "degrade-ativo font-semibold text-white"
              : dentro
                ? "bg-superficie-2 font-semibold text-texto"
                : "font-medium text-suave hover:bg-superficie-2 hover:text-texto"
          }`}
        >
          <Icone
            className="h-5 w-5 shrink-0"
            strokeWidth={ativo || dentro ? 2.25 : 1.75}
            aria-hidden="true"
          />
          <span className="hidden whitespace-nowrap menu-aberto:inline">
            {rotulo}
          </span>
        </Link>
        {filhos ? (
          <ul className="mt-1 flex flex-col gap-1 menu-aberto:ml-5 menu-aberto:border-l menu-aberto:border-linha menu-aberto:pl-2">
            {filhos.map((f) => {
              const a = filhoAtivo(filhos, f.href);
              return (
                <li key={f.href + f.rotulo}>
                  <Link
                    href={f.href}
                    aria-current={a ? "page" : undefined}
                    title={f.rotulo}
                    className={`flex h-9 items-center justify-center gap-2.5 rounded-lg px-3 text-[13px] transition menu-aberto:justify-start menu-aberto:px-2.5 ${
                      a
                        ? "degrade-ativo font-semibold text-white"
                        : "font-medium text-suave hover:bg-superficie-2 hover:text-texto"
                    }`}
                  >
                    <f.Icone
                      className="h-4 w-4 shrink-0"
                      strokeWidth={a ? 2.25 : 1.75}
                      aria-hidden="true"
                    />
                    <span className="hidden whitespace-nowrap menu-aberto:inline">
                      {f.rotulo}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col border-r border-linha bg-superficie px-2.5 py-4 transition-[width] duration-200 ease-out menu-aberto:w-60 lg:flex">
      <div className="flex h-11 items-center justify-between gap-2 px-1">
        <Link href="/inicio" aria-label="Início" className="flex items-center">
          <IconeApp className="h-8 w-8 shrink-0 menu-aberto:hidden" />
          <span className="hidden menu-aberto:block">
            <Logo />
          </span>
        </Link>
        <button
          type="button"
          onClick={alternar}
          aria-pressed={aberto}
          aria-label="Recolher menu"
          title="Recolher menu"
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto menu-aberto:flex"
        >
          <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={alternar}
        aria-pressed={aberto}
        aria-label="Fixar menu aberto"
        title="Fixar menu aberto"
        className="mt-2 flex h-9 w-full items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto menu-aberto:hidden"
      >
        <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      <nav
        aria-label="Navegação principal"
        className="mt-5 flex flex-1 flex-col justify-between overflow-y-auto"
      >
        <ul className="flex flex-col gap-1">{PRINCIPAIS.map(item)}</ul>
        <ul className="mt-4 flex flex-col gap-1">{CONTA.map(item)}</ul>
      </nav>

      <div className="mt-3 flex flex-col gap-1 border-t border-linha pt-3">
        <div className="flex flex-col items-center gap-1 menu-aberto:flex-row menu-aberto:px-1">
          <Link
            href="/conta"
            title={nome}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-superficie-2 font-display text-sm font-semibold text-texto"
          >
            {(nome || "?").charAt(0).toUpperCase()}
          </Link>
          <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-texto menu-aberto:block">
            {nome || "Sua conta"}
          </span>
          <AlternarTema />
          <BotaoSair />
        </div>
      </div>
    </aside>
  );
}
