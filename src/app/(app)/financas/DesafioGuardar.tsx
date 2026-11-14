"use client";

import { Check, Lock, Star, Trophy } from "lucide-react";
import {
  PASSO_RITMO,
  nomeMes,
  type Categoria,
  type EscadaGuardar,
  type MetaGuardar,
} from "@/lib/dominio/financas";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl0 } from "@/components/financas/formato";

// Meta de guardar (criada na jornada do plano): a meta sobe mês a mês como degraus, cada degrau
// batido vale coins, e mostro o que mais pesa para chegar lá. Aqui só se acompanha.
export function DesafioGuardar({
  meta,
  escada,
  categorias,
}: {
  meta: MetaGuardar;
  escada: EscadaGuardar;
  categorias: Categoria[];
}) {
  const cat = (id: string) => categorias.find((c) => c.id === id);
  const atual = escada.atual;
  const pctAtual = atual?.guardadoPct ?? 0;
  const progresso = atual
    ? Math.min(100, Math.max(0, (pctAtual / Math.max(1, atual.alvoPct)) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">
              Meta de guardar {meta.alvoPct}% da renda
            </h2>
            <p className="text-sm text-suave">
              Ritmo {PASSO_RITMO[meta.ritmo].rotulo.toLowerCase()} ·{" "}
              {escada.batidos}{" "}
              {escada.batidos === 1 ? "degrau batido" : "degraus batidos"} ·
              alvo em {nomeMes(escada.mesAlvo).toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Escada de degraus */}
      <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {escada.degraus.map((d) => {
          const estilo =
            d.estado === "batido"
              ? "degrade-ativo border-transparent text-white"
              : d.estado === "andamento"
                ? "border-ciano bg-ciano/8 text-texto"
                : d.estado === "faltou"
                  ? "border-gravata/50 bg-gravata/8 text-texto"
                  : "border-linha text-suave";
          return (
            <li
              key={d.mes}
              className={`flex w-[5.25rem] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center ${estilo}`}
            >
              <span
                className={`text-[10px] font-semibold uppercase ${d.estado === "batido" ? "text-white/80" : "text-suave"}`}
              >
                {nomeMes(d.mes, true)}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums leading-none">
                {d.alvoPct}%
              </span>
              <span className="flex h-4 items-center">
                {d.estado === "batido" ? (
                  <Star
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    aria-label="Batido"
                  />
                ) : d.estado === "futuro" ? (
                  <Lock className="h-3 w-3" aria-label="Futuro" />
                ) : d.estado === "faltou" ? (
                  <span className="text-[10px] text-gravata">
                    {d.guardadoPct ?? 0}%
                  </span>
                ) : (
                  <span className="text-[10px] text-ciano">agora</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Mês atual */}
        <div className="flex flex-col gap-3 rounded-2xl bg-superficie-2/50 p-4">
          <p className="text-xs font-semibold text-suave">Degrau deste mês</p>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl font-semibold tabular-nums text-texto">
              {Math.round(pctAtual)}%
            </span>
            <span className="text-sm text-suave">
              meta {atual?.alvoPct ?? meta.alvoPct}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-superficie">
            <div
              className="degrade-ativo h-full rounded-full transition-all"
              style={{ width: `${Math.max(3, progresso)}%` }}
            />
          </div>
          <p className="text-sm text-texto">
            {escada.faltaNoMes > 0 ? (
              <>
                Faltam{" "}
                <span className="font-semibold text-gravata">
                  {brl0(escada.faltaNoMes)}
                </span>{" "}
                de sobra para bater o degrau ({brl0(atual?.valorAlvo ?? 0)} no
                mês).
              </>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-menta">
                <Check className="h-4 w-4" aria-hidden="true" /> Degrau
                garantido até aqui. Mantendo, vale +40 coins no fechamento do
                mês.
              </span>
            )}
          </p>
        </div>

        {/* O que está impedindo */}
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-suave">
            O que mais pesa este mês
          </p>
          {escada.impedimentos.length ? (
            <ul className="flex flex-col gap-2">
              {escada.impedimentos.map((i) => {
                const c = cat(i.categoriaId);
                return (
                  <li key={i.categoriaId} className="flex items-center gap-3">
                    <IconeCategoria
                      icone={c?.icone ?? "Tag"}
                      cor={c?.cor ?? "#94A3B8"}
                      tamanho={30}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-texto">
                        {c?.nome ?? "Outros"}
                      </span>
                      <span className="block text-xs text-suave">
                        média {brl0(i.media)} por mês
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-texto">
                        {brl0(i.gasto)}
                      </span>
                      {i.excesso > 0 ? (
                        <span className="block text-xs font-semibold text-gravata">
                          +{brl0(i.excesso)}
                        </span>
                      ) : (
                        <span className="block text-xs text-menta">
                          dentro da média
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-suave">
              Nenhum gasto variável acima da média este mês.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
