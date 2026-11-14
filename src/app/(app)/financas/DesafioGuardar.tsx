"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Loader2, Lock, Star, Trophy, X } from "lucide-react";
import { PASSO_RITMO, nomeMes, type Categoria, type EscadaGuardar, type MetaGuardar, type RitmoGuardar } from "@/lib/dominio/financas";
import { encerrarMetaGuardar, salvarMetaGuardar } from "@/app/acoes-financas";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl0 } from "@/components/financas/formato";

// Desafio de guardar: a pessoa escolhe o alvo (% da renda) e o ritmo; a meta sobe mês a mês
// como degraus, cada degrau batido vale coins, e eu mostro o que mais pesa para chegar lá.
export function DesafioGuardar({ meta, escada, rendaAtual, categorias }: { meta: MetaGuardar | null; escada: EscadaGuardar | null; rendaAtual: number; categorias: Categoria[] }) {
  const router = useRouter();
  const [alvo, setAlvo] = useState(meta?.alvoPct ?? Math.min(60, Math.max(10, Math.ceil((rendaAtual + 10) / 5) * 5)));
  const [ritmo, setRitmo] = useState<RitmoGuardar>(meta?.ritmo ?? "moderado");
  const [editando, setEditando] = useState(!meta);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const cat = (id: string) => categorias.find((c) => c.id === id);
  const mesesAteAlvo = Math.max(0, Math.ceil((alvo - Math.min(rendaAtual, alvo)) / PASSO_RITMO[ritmo].passo));

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarMetaGuardar({ alvoPct: alvo, ritmo });
      if ("erro" in r) setErro(r.erro);
      else {
        setEditando(false);
        router.refresh();
      }
    });
  }

  if (editando || !meta || !escada) {
    return (
      <div className="painel flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-texto">Desafio de guardar</h2>
              <p className="text-sm text-suave">Hoje você guarda cerca de {rendaAtual}% da renda. Escolha onde quer chegar e em que ritmo: a meta sobe um degrau por mês.</p>
            </div>
          </div>
          {meta ? (
            <button type="button" onClick={() => setEditando(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2" aria-label="Cancelar">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="flex items-baseline justify-between text-xs font-semibold text-suave">
              Quero guardar
              <span className="font-display text-2xl font-semibold tabular-nums text-texto">{alvo}% da renda</span>
            </span>
            <input type="range" min={5} max={60} step={1} value={alvo} onChange={(e) => setAlvo(Number(e.target.value))} className="accent-[var(--destaque)]" />
            <span className="flex justify-between text-[11px] text-suave">
              <span>5%</span>
              <span>20% é a referência</span>
              <span>60%</span>
            </span>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-suave">Ritmo</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PASSO_RITMO) as RitmoGuardar[]).map((r) => (
                <button key={r} type="button" onClick={() => setRitmo(r)} aria-pressed={ritmo === r} className={`flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 text-center transition ${ritmo === r ? "degrade-ativo border-transparent text-white" : "border-linha text-texto hover:bg-superficie-2"}`}>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    {r === "agressivo" ? <Flame className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    {PASSO_RITMO[r].rotulo}
                  </span>
                  <span className={`text-[11px] ${ritmo === r ? "text-white/80" : "text-suave"}`}>{PASSO_RITMO[r].texto}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-suave">{mesesAteAlvo === 0 ? "Você já está no alvo: o desafio é manter." : `Você chega a ${alvo}% em ${mesesAteAlvo} ${mesesAteAlvo === 1 ? "mês" : "meses"}.`}</p>
          </div>
        </div>
        {erro ? <p className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro">{erro}</p> : null}
        <button type="button" onClick={salvar} disabled={pendente} className="gradiente-marca flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white sm:w-fit sm:px-6">
          {pendente ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trophy className="h-4 w-4" aria-hidden="true" />}
          {meta ? "Salvar novo desafio" : "Começar o desafio"}
        </button>
      </div>
    );
  }

  const atual = escada.atual;
  const pctAtual = atual?.guardadoPct ?? 0;
  const progresso = atual ? Math.min(100, Math.max(0, (pctAtual / Math.max(1, atual.alvoPct)) * 100)) : 0;

  return (
    <div className="painel flex flex-col gap-5 p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">Desafio de guardar {meta.alvoPct}%</h2>
            <p className="text-sm text-suave">
              Ritmo {PASSO_RITMO[meta.ritmo].rotulo.toLowerCase()} · {escada.batidos} {escada.batidos === 1 ? "degrau batido" : "degraus batidos"} · alvo em {nomeMes(escada.mesAlvo).toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditando(true)} className="h-9 rounded-full border border-linha px-3.5 text-xs font-semibold text-texto hover:bg-superficie-2">
            Ajustar
          </button>
          <button
            type="button"
            onClick={() =>
              window.confirm("Encerrar o desafio de guardar?") &&
              iniciar(async () => {
                await encerrarMetaGuardar();
                router.refresh();
              })
            }
            className="h-9 rounded-full px-3 text-xs font-semibold text-suave hover:text-erro"
          >
            Encerrar
          </button>
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
            <li key={d.mes} className={`flex w-[5.25rem] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center ${estilo}`}>
              <span className={`text-[10px] font-semibold uppercase ${d.estado === "batido" ? "text-white/80" : "text-suave"}`}>{nomeMes(d.mes, true)}</span>
              <span className="font-display text-lg font-semibold tabular-nums leading-none">{d.alvoPct}%</span>
              <span className="flex h-4 items-center">
                {d.estado === "batido" ? <Star className="h-3.5 w-3.5" fill="currentColor" aria-label="Batido" /> : d.estado === "futuro" ? <Lock className="h-3 w-3" aria-label="Futuro" /> : d.estado === "faltou" ? <span className="text-[10px] text-gravata">{d.guardadoPct ?? 0}%</span> : <span className="text-[10px] text-ciano">agora</span>}
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
            <span className="font-display text-3xl font-semibold tabular-nums text-texto">{Math.round(pctAtual)}%</span>
            <span className="text-sm text-suave">meta {atual?.alvoPct ?? meta.alvoPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-superficie">
            <div className="degrade-ativo h-full rounded-full transition-all" style={{ width: `${Math.max(3, progresso)}%` }} />
          </div>
          <p className="text-sm text-texto">
            {escada.faltaNoMes > 0 ? (
              <>
                Faltam <span className="font-semibold text-gravata">{brl0(escada.faltaNoMes)}</span> de sobra para bater o degrau ({brl0(atual?.valorAlvo ?? 0)} no mês).
              </>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-menta">
                <Check className="h-4 w-4" aria-hidden="true" /> Degrau garantido até aqui. Mantendo, vale +40 coins no fechamento do mês.
              </span>
            )}
          </p>
        </div>

        {/* O que está impedindo */}
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-suave">O que mais pesa este mês</p>
          {escada.impedimentos.length ? (
            <ul className="flex flex-col gap-2">
              {escada.impedimentos.map((i) => {
                const c = cat(i.categoriaId);
                return (
                  <li key={i.categoriaId} className="flex items-center gap-3">
                    <IconeCategoria icone={c?.icone ?? "Tag"} cor={c?.cor ?? "#94A3B8"} tamanho={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-texto">{c?.nome ?? "Outros"}</span>
                      <span className="block text-xs text-suave">média {brl0(i.media)} por mês</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-texto">{brl0(i.gasto)}</span>
                      {i.excesso > 0 ? <span className="block text-xs font-semibold text-gravata">+{brl0(i.excesso)}</span> : <span className="block text-xs text-menta">dentro da média</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-suave">Nenhum gasto variável acima da média este mês.</p>
          )}
        </div>
      </div>
    </div>
  );
}
