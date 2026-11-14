import Link from "next/link";
import { Target, Wallet } from "lucide-react";

// Duas áreas ligadas: o controle financeiro (o que entra e sai) e os planos (metas que usam esse controle).
export function AbasFinancas({
  ativa,
  planos,
}: {
  ativa: "controle" | "planos";
  planos: number;
}) {
  const abas = [
    {
      id: "controle",
      href: "/financas",
      rotulo: "Controle financeiro",
      curto: "Controle",
      Icone: Wallet,
      extra: null,
    },
    {
      id: "planos",
      href: "/financas/planos",
      rotulo: "Planos",
      curto: "Planos",
      Icone: Target,
      extra: planos || null,
    },
  ] as const;
  return (
    <nav
      className="flex w-full rounded-2xl border border-linha bg-superficie p-1 sm:w-fit"
      aria-label="Finanças"
    >
      {abas.map(({ id, href, rotulo, curto, Icone, extra }) => (
        <Link
          key={id}
          href={href}
          aria-current={ativa === id ? "page" : undefined}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition sm:flex-none ${ativa === id ? "degrade-ativo text-white" : "text-suave hover:bg-superficie-2 hover:text-texto"}`}
        >
          <Icone className="h-4 w-4" aria-hidden="true" />
          <span className="sm:hidden">{curto}</span>
          <span className="hidden sm:inline">{rotulo}</span>
          {extra ? (
            <span
              className={`rounded-full px-1.5 text-[11px] tabular-nums ${ativa === id ? "bg-white/20" : "bg-superficie-2"}`}
            >
              {extra}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
