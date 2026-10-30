import Link from "next/link";
import { Coins } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { resumoMoedas } from "@/lib/dominio/moedas";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { uid, repo } = await exigirUsuario();
  const { saldo, nivel } = resumoMoedas(await repo.listarMoedas(uid));
  return (
    <>
      <header className="vidro sticky top-0 z-20 border-b border-linha/60">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link href="/inicio" aria-label="Início">
            <Logo />
          </Link>
          <Link
            href="/aprender#coins"
            className="flex min-h-11 items-center gap-2 rounded-full border border-ambar/40 bg-ambar/10 px-3 text-sm"
            aria-label={`${saldo} coins, nível ${nivel}`}
          >
            <Coins className="h-4 w-4 text-ambar" aria-hidden="true" />
            <span className="font-bold text-ambar">{saldo}</span>
            <span className="text-xs text-suave">{nivel}</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">{children}</div>
      <TabBar />
    </>
  );
}
