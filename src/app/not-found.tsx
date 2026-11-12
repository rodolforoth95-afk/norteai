import Link from "next/link";
import { Mascote } from "@/components/Logo";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Mascote className="h-20 w-20" sorriso={false} />
      <p className="font-display text-5xl font-bold texto-gradiente">404</p>
      <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto">Página não encontrada</h1>
      <p className="text-suave">Procurei por toda parte e não achei. O endereço pode ter mudado ou o ativo não existe na B3.</p>
      <Link href="/inicio" className="gradiente-marca inline-flex min-h-12 items-center justify-center rounded-2xl px-6 font-semibold text-white">
        Ir para o início
      </Link>
    </main>
  );
}
