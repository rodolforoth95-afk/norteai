import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { hojeBR } from "@/lib/dominio/carteira";
import {
  diagnosticar,
  mesDe,
  planosDe,
  rendaGuardadaAtual,
} from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel } from "@/lib/servidor/ia";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { JornadaPlano } from "./JornadaPlano";

// Criação e edição de um plano: os mesmos 4 passos, a partir do Acompanhamento.
export async function TelaJornada({ planoId }: { planoId: string | null }) {
  const { uid, repo } = await exigirUsuario();
  const dados = await carregarFinancas(repo, uid);
  const mesAtual = mesDe(hojeBR());
  const meta = planoId
    ? (planosDe(dados).find((m) => m.id === planoId) ?? null)
    : null;
  if (planoId && !meta) notFound();
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:gap-6">
      <div>
        <Link
          href={meta ? `/financas/planos/${meta.id}` : "/financas/planos"}
          className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />{" "}
          {meta ? meta.nome : "Planos"}
        </Link>
        <h1 className="mt-1 font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">
          {meta ? "Editar plano" : "Novo plano"}
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm text-suave">
          Quatro passos a partir do seu Acompanhamento: o ponto de partida,
          quanto guardar, quanto investir e a revisão.
        </p>
      </div>
      <JornadaPlano
        key={meta?.id ?? "novo"}
        diagnosticos={{
          30: diagnosticar(dados, mesAtual, 30),
          60: diagnosticar(dados, mesAtual, 60),
          90: diagnosticar(dados, mesAtual, 90),
        }}
        categorias={dados.categorias}
        meta={meta}
        metaGuardar={meta?.guardar ?? null}
        rendaAtual={rendaGuardadaAtual(dados, mesAtual)}
        ia={iaDisponivel()}
        temLancamentos={dados.lancamentos.length > 0}
      />
      <AvisoEducacional extra="O plano usa apenas os seus lançamentos e não indica produtos financeiros." />
    </section>
  );
}
