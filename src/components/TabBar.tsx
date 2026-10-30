"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CandlestickChart, Home, PieChart, User } from "lucide-react";

const ABAS = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
  { href: "/conta", rotulo: "Conta", Icone: User },
];

export function TabBar() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="vidro fixed inset-x-0 bottom-0 z-20 border-t border-linha pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativa = caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                  ativa ? "font-bold text-texto" : "text-suave"
                }`}
              >
                {ativa ? (
                  <span className="gradiente-marca absolute top-0 h-0.5 w-10 rounded-full" aria-hidden="true" />
                ) : null}
                <Icone
                  className={`h-6 w-6 ${ativa ? "text-ciano" : ""}`}
                  aria-hidden="true"
                  strokeWidth={ativa ? 2.25 : 1.75}
                />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
