"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Mascote } from "@/components/Logo";

// Tela amigável quando algo dá errado (no lugar da página de erro padrão).
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Mascote className="h-20 w-20" sorriso={false} />
      <h1 className="font-display text-2xl font-bold text-texto">Ops, algo deu errado</h1>
      <p className="text-suave">Não consegui carregar esta tela agora. Tente de novo em instantes, eu continuo aqui.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={reset} className="gradiente-marca inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold text-white">
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
