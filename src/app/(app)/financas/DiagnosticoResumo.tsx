import Link from "next/link";
import { ArrowRight, Repeat, Stethoscope, TrendingDown } from "lucide-react";
import type { Categoria, Diagnostico } from "@/lib/dominio/financas";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl0 } from "@/components/financas/formato";

// Diagnóstico dos gastos (90 dias) logo no início de Finanças: médias, maiores ralos e recorrentes.
export function DiagnosticoResumo({ diag, categorias }: { diag: Diagnostico; categorias: Categoria[] }) {
  const cat = (id: string) => categorias.find((c) => c.id === id);
  const recorrentes = diag.assinaturas.reduce((s, a) => s + a.valorMensal, 0);
  return (
    <div className="painel flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="degrade-ativo flex h-9 w-9 items-center justify-center rounded-xl text-white">
            <Stethoscope className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-texto">Diagnóstico dos seus gastos</h2>
            <p className="text-xs text-suave">Média dos últimos {diag.meses.length || 1} {diag.meses.length === 1 ? "mês" : "meses"}</p>
          </div>
        </div>
        <Link href="/financas/plano" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ciano hover:underline">
          Detalhes <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-2 2xl:grid-cols-4">
        {[
          { rotulo: "Entra", valor: diag.receitaMedia, cor: "text-texto" },
          { rotulo: "Sai", valor: diag.despesaMedia, cor: "text-texto" },
          { rotulo: "Essencial", valor: diag.fixasMedia, cor: "text-texto" },
          { rotulo: "Sobra", valor: diag.sobraMedia, cor: diag.sobraMedia >= 0 ? "text-ciano" : "text-erro" },
        ].map((x) => (
          <div key={x.rotulo} className="rounded-xl bg-superficie-2/60 px-3 py-2.5">
            <dt className="text-[11px] text-suave">{x.rotulo}</dt>
            <dd className={`font-display text-base font-semibold tabular-nums ${x.cor}`}>{brl0(x.valor)}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-suave">
          <TrendingDown className="h-3.5 w-3.5 text-gravata" aria-hidden="true" /> Onde dá para ajustar
        </p>
        {diag.ralos.length ? (
          <ul className="flex flex-col gap-1.5">
            {diag.ralos.slice(0, 3).map((r) => {
              const c = cat(r.categoriaId);
              return (
                <li key={r.categoriaId} className="flex items-center gap-2.5">
                  <IconeCategoria icone={c?.icone ?? "Tag"} cor={c?.cor ?? "#94A3B8"} tamanho={26} />
                  <span className="min-w-0 flex-1 truncate text-sm text-texto">{c?.nome ?? "Outros"}</span>
                  <span className="text-xs text-suave">{Math.round(r.pctDespesas)}%</span>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-texto">{brl0(r.mediaMensal)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-suave">Nenhum gasto variável fora do padrão.</p>
        )}
      </div>

      {diag.assinaturas.length ? (
        <div className="mt-auto flex items-start gap-2 rounded-xl border border-linha px-3 py-2.5 text-xs text-suave">
          <Repeat className="mt-px h-3.5 w-3.5 shrink-0 text-ciano" aria-hidden="true" />
          <p>
            {diag.assinaturas.length} cobranças recorrentes somam <strong className="font-semibold text-texto">{brl0(recorrentes)}/mês</strong> ({brl0(recorrentes * 12)} por ano).
          </p>
        </div>
      ) : null}
    </div>
  );
}
