import Link from "next/link";
import { Estrela } from "@/components/Logo";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Estrela className="h-14 w-14" />
      <p className="font-display text-5xl font-bold texto-gradiente">404</p>
      <h1 className="font-display text-2xl font-bold text-texto">Página não encontrada</h1>
      <p className="text-suave">O endereço pode ter mudado ou o ativo não existe na B3.</p>
      <Link href="/inicio" className="gradiente-marca inline-flex min-h-12 items-center justify-center rounded-2xl px-6 font-semibold text-black">
        Ir para o início
      </Link>
    </main>
  );
}
