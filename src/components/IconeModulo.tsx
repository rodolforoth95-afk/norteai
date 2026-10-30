import { BarChart3, Building2, Landmark, Search, ShieldCheck, Wallet } from "lucide-react";
import type { Modulo } from "@/lib/conteudo/modulos";

const ICONES = { base: Landmark, carteira: Wallet, acoes: Building2, grafico: BarChart3, escudo: ShieldCheck, lupa: Search };

export function IconeModulo({ icone, className = "h-6 w-6" }: { icone: Modulo["icone"]; className?: string }) {
  const Icone = ICONES[icone];
  return <Icone className={className} aria-hidden="true" />;
}
