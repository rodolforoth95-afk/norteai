import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { linhasDaCarteira } from "@/lib/dominio/carteira";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarCarteira } from "@/lib/servidor/carteira";
import { iaDisponivel } from "@/lib/servidor/ia";
import { Importador } from "./Importador";

export const metadata = { title: "Importar extrato" };

// Importação: lê o extrato (PDF, planilha, imagem) ou recebe os saldos digitados,
// compara com a carteira atual e só grava depois da conferência.
export default async function PaginaImportar() {
  const { uid, repo } = await exigirUsuario();
  const carteira = await carregarCarteira(repo, uid);
  const existentes = linhasDaCarteira(carteira).map((l) => ({
    id: l.inv.id,
    nome: l.inv.nome,
    classe: l.inv.classe,
    saldo: l.saldo,
    quantidade: l.inv.quantidade,
    ultimaData: l.ultimaData,
  }));
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/carteira" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Carteira
      </Link>
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.01em] text-texto">Importar ou atualizar saldos</h1>
        <p className="mt-1 text-sm text-suave">
          Envie o extrato ou digite os saldos. Comparamos com o que você já tem, mostramos o que rendeu e o que é novo, e você confirma antes de salvar.
        </p>
      </div>
      <Importador existentes={existentes} iaLigada={iaDisponivel()} />
    </section>
  );
}
