import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { hojeBR } from "@/lib/dominio/carteira";
import { diagnosticar, mesDe, progressoMeta } from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { aportesPorMes, carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel } from "@/lib/servidor/ia";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { PlanoMordomo } from "./PlanoMordomo";

export const metadata = { title: "Plano de aporte" };

export default async function PaginaPlano() {
  const { uid, repo } = await exigirUsuario();
  const [dados, aportes] = await Promise.all([carregarFinancas(repo, uid), aportesPorMes(repo, uid)]);
  const mesAtual = mesDe(hojeBR());
  const meta = dados.metas.find((m) => m.ativa) ?? null;
  const progresso = meta ? progressoMeta(dados, meta, mesAtual, aportes) : null;
  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <div>
        <Link href="/financas" className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Finanças
        </Link>
        <h1 className="mt-1 font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">Plano de aporte</h1>
        <p className="mt-0.5 text-sm text-suave">Diga quanto quer investir por mês. Eu olho seus gastos e mostro onde ajustar, sem mexer no essencial.</p>
      </div>
      <PlanoMordomo
        diagnosticos={{ 30: diagnosticar(dados, mesAtual, 30), 60: diagnosticar(dados, mesAtual, 60), 90: diagnosticar(dados, mesAtual, 90) }}
        categorias={dados.categorias}
        meta={meta}
        progresso={progresso}
        ia={iaDisponivel()}
        temLancamentos={dados.lancamentos.length > 0}
      />
      <AvisoEducacional extra="O plano usa apenas os seus lançamentos e não indica produtos financeiros." />
    </section>
  );
}
