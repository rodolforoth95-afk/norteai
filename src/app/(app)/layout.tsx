import Link from "next/link";
import { Coins } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { BarraLateral } from "@/components/BarraLateral";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { resumoMoedas } from "@/lib/dominio/moedas";

// Celular: cabeçalho no topo e abas embaixo. Computador: menu lateral e conteúdo largo.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const { saldo, nivel } = resumoMoedas(await repo.listarMoedas(uid));
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-superficie focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      <BarraLateral saldo={saldo} nivel={nivel} nome={primeiroNome} />

      <header className="vidro sticky top-0 z-20 border-b border-linha lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-[76rem] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/inicio" aria-label="Início">
            <Logo tamanho="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/aprender#coins"
              className="flex h-9 items-center gap-1.5 rounded-full border border-linha bg-superficie px-3 text-sm font-semibold tabular-nums text-texto"
              aria-label={`${saldo} coins, nível ${nivel}`}
            >
              <Coins className="h-4 w-4 text-gravata" aria-hidden="true" />
              {saldo.toLocaleString("pt-BR")}
            </Link>
            <Link
              href="/conta"
              aria-label="Conta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-linha bg-superficie font-display text-sm font-extrabold text-texto"
            >
              {(primeiroNome || "?").charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo" className="lg:pl-64">
        <div className="mx-auto w-full max-w-[76rem] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      <TabBar />
    </>
  );
}
