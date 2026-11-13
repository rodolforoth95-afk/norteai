"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CandlestickChart, FlaskConical, Home, PieChart } from "lucide-react";

const ABAS = [
  { href: "/inicio", rotulo: "Início", Icone: Home },
  { href: "/mercado", rotulo: "Mercado", Icone: CandlestickChart },
  { href: "/carteira", rotulo: "Carteira", Icone: PieChart },
  { href: "/simulador", rotulo: "Simular", Icone: FlaskConical },
  { href: "/aprender", rotulo: "Aprender", Icone: BookOpen },
];

export function TabBar() {
  const caminho = usePathname();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="vidro mx-auto grid max-w-lg grid-cols-5 rounded-2xl border border-linha p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5)]">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativa = caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition ${
                  ativa ? "bg-superficie-2 font-semibold text-texto" : "text-suave"
                }`}
              >
                <Icone className={`h-[22px] w-[22px] ${ativa ? "text-ciano" : ""}`} aria-hidden="true" strokeWidth={ativa ? 2.25 : 1.75} />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
