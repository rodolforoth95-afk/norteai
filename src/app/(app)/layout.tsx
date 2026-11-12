import Link from "next/link";
import { Coins, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { BarraLateral } from "@/components/BarraLateral";
import { BotaoSair } from "@/components/BotaoSair";
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

      <header className="vidro sticky top-0 z-20 border-b border-linha/60 lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-5 py-3">
          <Link href="/inicio" aria-label="Início">
            <Logo tamanho="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/aprender#coins"
              className="flex min-h-11 items-center gap-2 rounded-full border border-ambar/40 bg-ambar/10 px-3 text-sm"
              aria-label={`${saldo} coins, nível ${nivel}`}
            >
              <Coins className="h-4 w-4 text-ambar" aria-hidden="true" />
              <span className="font-bold text-ambar">{saldo}</span>
              <span className="hidden text-xs text-suave min-[400px]:inline">{nivel}</span>
            </Link>
            <Link
              href="/conta"
              aria-label="Conta"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-linha bg-superficie text-texto transition hover:border-violeta"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
            <BotaoSair />
          </div>
        </div>
      </header>

      <main id="conteudo" className="lg:pl-64">
        <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6 lg:max-w-6xl lg:px-10 lg:pb-14 lg:pt-10">{children}</div>
      </main>

      <TabBar />
    </>
  );
}
