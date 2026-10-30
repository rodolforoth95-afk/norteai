import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { Importador } from "./Importador";

// Tela 7 — Importar carteira
export default async function PaginaImportar() {
  await exigirUsuario();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/carteira" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Carteira
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-texto">Importar carteira</h1>
        <p className="mt-1 text-sm text-suave">Envie um PDF ou planilha, ou digite seus investimentos. Você revisa tudo antes de salvar.</p>
      </div>
      <Importador />
    </section>
  );
}
