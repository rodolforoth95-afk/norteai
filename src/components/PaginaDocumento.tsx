import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PaginaDocumento({ titulo, versao, children }: { titulo: string; versao: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-medium text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Voltar
      </Link>
      <h1 className="mt-4 font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto">{titulo}</h1>
      <p className="mt-1 text-sm text-suave">Versão {versao} · texto provisório</p>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-texto">{children}</div>
    </main>
  );
}
