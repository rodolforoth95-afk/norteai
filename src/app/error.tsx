"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Estrela } from "@/components/Logo";

// Tela amigável quando algo dá errado (no lugar da página de erro padrão).
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Estrela className="h-14 w-14" />
      <h1 className="font-display text-2xl font-bold text-texto">Algo saiu do rumo</h1>
      <p className="text-suave">Não conseguimos carregar esta tela agora. Tente de novo em instantes.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={reset} className="gradiente-marca inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold text-black">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar de novo
        </button>
        <Link href="/inicio" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-linha px-5 font-medium text-texto">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
