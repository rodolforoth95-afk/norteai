import Link from "next/link";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import type { EscadaGuardar, ItemOrcamento } from "@/lib/dominio/financas";
import { brl0 } from "@/components/financas/formato";

type Props = {
  meta: {
    nome: string;
    destino: string;
    valorMensal: number;
    meses: number;
  } | null;
  planoId: string | null;
  escada: EscadaGuardar | null;
  progresso: { economizado: number; objetivo: number; pct: number } | null;
  orcamento: ItemOrcamento[];
  totalPlanos: number;
};

// A ponte entre o Acompanhamento e os Planos: um resumo do plano em foco, calculado com os lançamentos.
export function PlanoEmFoco({
  meta,
  planoId,
  escada,
  progresso,
  orcamento,
  totalPlanos,
}: Props) {
  if (!meta || !planoId) {
    return (
      <div className="painel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ciano/12 text-ciano">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-texto">
              {totalPlanos
                ? "Nenhum plano em foco"
                : "Dê um destino a esse dinheiro"}
            </p>
            <p className="text-sm text-suave">
              {totalPlanos
                ? "Escolha um dos seus planos para acompanhar aqui, junto com o Acompanhamento."
                : "Com um plano, o Acompanhamento passa a mostrar se você está guardando e investindo o que quer."}
            </p>
          </div>
        </div>
        <Link
          href={totalPlanos ? "/financas/planos" : "/financas/planos/novo"}
          className="gradiente-marca flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
        >
          {totalPlanos ? "Escolher plano" : "Criar um plano"}{" "}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const atual = escada?.atual ?? null;
  const guardado = atual ? Math.round(atual.guardadoPct ?? 0) : null;
  const estourados = orcamento.filter((o) => o.estado === "estourou").length;
  const itens = [
    {
      rotulo: "Guardado no mês",
      valor: guardado !== null && atual ? `${guardado}%` : "—",
      detalhe: atual ? `meta ${atual.alvoPct}%` : "sem meta de guardar",
      ok: guardado !== null && atual ? guardado >= atual.alvoPct : null,
    },
    {
      rotulo: "Acumulado",
      valor: progresso ? brl0(progresso.economizado) : "—",
      detalhe: progresso
        ? `${Math.round(progresso.pct)}% de ${brl0(progresso.objetivo)}`
        : "",
      ok: null,
    },
    {
      rotulo: "Limites do mês",
      valor: orcamento.length
        ? estourados
          ? `${estourados} acima`
          : "Em dia"
        : "—",
      detalhe: orcamento.length
        ? `${orcamento.length} categorias acompanhadas`
        : "sem cortes no plano",
      ok: orcamento.length ? estourados === 0 : null,
    },
  ];

  return (
    <div className="painel flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:gap-6">
      <div className="flex min-w-0 items-center gap-3 xl:w-[16rem] xl:shrink-0">
        <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ciano">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Plano em foco
          </p>
          <p className="truncate font-display text-base font-semibold text-texto">
            {meta.nome}
          </p>
          <p className="truncate text-xs text-suave">
            {brl0(meta.valorMensal)}/mês para {meta.destino.toLowerCase()}
          </p>
        </div>
      </div>
      <dl className="grid flex-1 grid-cols-3 gap-2">
        {itens.map((i) => (
          <div
            key={i.rotulo}
            className="min-w-0 rounded-xl bg-superficie-2/60 px-3 py-2.5"
          >
            <dt className="truncate text-[11px] text-suave">{i.rotulo}</dt>
            <dd
              className={`truncate font-display text-base font-semibold tabular-nums ${i.ok === false ? "text-gravata" : i.ok ? "text-menta" : "text-texto"}`}
            >
              {i.valor}
            </dd>
            <dd className="truncate text-[10px] text-suave sm:text-[11px]">
              {i.detalhe}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex shrink-0 gap-2 sm:w-fit xl:w-auto">
        <Link
          href={`/financas/planos/${planoId}`}
          className="gradiente-marca flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
        >
          Ver plano <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {totalPlanos > 1 ? (
          <Link
            href="/financas/planos"
            className="flex h-10 items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
          >
            Trocar
          </Link>
        ) : null}
      </div>
    </div>
  );
}
