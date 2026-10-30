import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { FormNovoInvestimento } from "./FormNovoInvestimento";

export const metadata = { title: "Adicionar investimento" };

export default async function PaginaAdicionar() {
  await exigirUsuario();
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/carteira" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Carteira
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-texto">Adicionar investimento</h1>
        <p className="mt-1 text-sm text-suave">Cadastre um investimento por vez, com a data e o valor da aplicação. Depois você registra aplicações, resgates e atualizações de saldo.</p>
      </div>
      <FormNovoInvestimento />
    </section>
  );
}
