"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeloVariacao, formatarPreco } from "@/components/mercado";
import { useCoresTema } from "@/components/useCoresTema";

type Ponto = { data: string; fechamento: number };

const PERIODOS = [
  { id: "5d", rotulo: "5D" },
  { id: "1mo", rotulo: "1M" },
  { id: "3mo", rotulo: "3M" },
] as const;

const dataCurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const dataLonga = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

// Gráfico interativo: ao tocar ou passar o mouse, o topo mostra o preço e a variação daquele dia.
export function GraficoAtivo({ simbolo, inicial }: { simbolo: string; inicial: Ponto[] }) {
  const [periodo, setPeriodo] = useState<string>("1mo");
  const [pontos, setPontos] = useState(inicial);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const tema = useCoresTema();

  async function trocar(p: string) {
    if (p === periodo) return;
    setPeriodo(p);
    setCarregando(true);
    setErro(false);
    try {
      const r = await fetch(`/api/mercado/historico?simbolo=${encodeURIComponent(simbolo)}&periodo=${p}`);
      if (!r.ok) throw new Error();
      setPontos((await r.json()).pontos);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  const primeiro = pontos[0]?.fechamento;
  const ultimo = pontos[pontos.length - 1]?.fechamento;
  const foco = ativo !== null && pontos[ativo] ? pontos[ativo] : pontos[pontos.length - 1];
  const variacao = primeiro && foco ? ((foco.fechamento - primeiro) / primeiro) * 100 : null;
  const cor = (ultimo ?? 0) >= (primeiro ?? 0) ? "#22C55E" : "#EF4444";

  return (
    <div className="rounded-3xl border border-linha bg-superficie p-4">
      <div className="flex items-end justify-between gap-2">
        <div aria-live="polite">
          <p className="text-[11px] uppercase tracking-wider text-suave">{foco ? dataLonga(foco.data) : "—"}</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-texto">{formatarPreco(foco?.fechamento)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SeloVariacao valor={variacao} />
          <span className="text-[11px] text-suave">no período</span>
        </div>
      </div>

      <div
        className={`mt-3 h-56 w-full touch-pan-y transition-opacity ${carregando ? "opacity-40" : ""}`}
        role="img"
        aria-label={`Fechamentos de ${simbolo}: de ${formatarPreco(primeiro)} para ${formatarPreco(ultimo)}`}
      >
        {pontos.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={periodo + pontos.length}
              data={pontos}
              margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
              onMouseMove={(estado) => {
                const i = Number(estado?.activeIndex);
                setAtivo(Number.isFinite(i) ? i : null);
              }}
              onMouseLeave={() => setAtivo(null)}
            >
              <defs>
                <linearGradient id="area-ativo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={tema.linha} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="data" tickFormatter={dataCurta} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              {primeiro ? <ReferenceLine y={primeiro} stroke={tema.suave} strokeOpacity={0.6} strokeDasharray="4 4" /> : null}
              <Tooltip content={() => null} cursor={{ stroke: tema.destaque, strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Area
                type="monotone"
                dataKey="fechamento"
                stroke={cor}
                strokeWidth={2.5}
                fill="url(#area-ativo)"
                animationDuration={900}
                animationEasing="ease-out"
                activeDot={{ r: 6, fill: tema.destaque, stroke: tema.superficie, strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-suave">Sem histórico para este período.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-superficie-2 p-1" role="tablist" aria-label="Período do gráfico">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === periodo}
              onClick={() => trocar(p.id)}
              className={`min-h-9 min-w-12 rounded-lg px-3 font-display text-sm font-semibold transition ${p.id === periodo ? "gradiente-marca text-black" : "text-suave hover:text-texto"}`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-suave">Linha tracejada: início do período</span>
      </div>
      {erro ? <p className="mt-2 text-xs text-erro" role="alert">Não foi possível carregar este período.</p> : null}
    </div>
  );
}
