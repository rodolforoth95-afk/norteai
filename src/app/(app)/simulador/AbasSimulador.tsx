"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Wallet } from "lucide-react";

// Abas do Simulador: carteiras de exemplo (projeção) e conta simulada (acompanhamento real).
export function AbasSimulador() {
  const caminho = usePathname();
  const abas = [
    { href: "/simulador", rotulo: "Carteiras de exemplo", Icone: FlaskConical, ativa: caminho === "/simulador" },
    { href: "/simulador/conta", rotulo: "Conta simulada", Icone: Wallet, ativa: caminho.startsWith("/simulador/conta") },
  ];
  return (
    <nav className="flex w-fit rounded-full border border-linha bg-superficie p-1" aria-label="Simulador">
      {abas.map(({ href, rotulo, Icone, ativa }) => (
        <Link key={href} href={href} aria-current={ativa ? "page" : undefined} className={`flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${ativa ? "degrade-ativo text-white" : "text-suave hover:text-texto"}`}>
          <Icone className="h-4 w-4" aria-hidden="true" />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}
