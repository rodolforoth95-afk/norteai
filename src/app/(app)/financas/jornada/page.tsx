import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { hojeBR } from "@/lib/dominio/carteira";
import { diagnosticar, mesDe, rendaGuardadaAtual } from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel } from "@/lib/servidor/ia";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { JornadaPlano } from "./JornadaPlano";

export const metadata = { title: "Meu plano financeiro" };

export default async function PaginaJornada() {
  const { uid, repo } = await exigirUsuario();
  const dados = await carregarFinancas(repo, uid);
  const mesAtual = mesDe(hojeBR());
  const meta = dados.metas.find((m) => m.ativa) ?? null;
  const temPlano = Boolean(meta || dados.metaGuardar);
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:gap-6">
      <div>
        <Link href="/financas" className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Finanças
        </Link>
        <h1 className="mt-1 font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">{temPlano ? "Refazer meu plano" : "Monte seu plano financeiro"}</h1>
        <p className="mt-0.5 text-sm text-suave">Quatro passos: seu ponto de partida, quanto guardar, quanto investir e a revisão.</p>
      </div>
      <JornadaPlano
        diagnosticos={{ 30: diagnosticar(dados, mesAtual, 30), 60: diagnosticar(dados, mesAtual, 60), 90: diagnosticar(dados, mesAtual, 90) }}
        categorias={dados.categorias}
        meta={meta}
        metaGuardar={dados.metaGuardar ?? null}
        rendaAtual={rendaGuardadaAtual(dados, mesAtual)}
        ia={iaDisponivel()}
        temLancamentos={dados.lancamentos.length > 0}
      />
      <AvisoEducacional extra="O plano usa apenas os seus lançamentos e não indica produtos financeiros." />
    </section>
  );
}
