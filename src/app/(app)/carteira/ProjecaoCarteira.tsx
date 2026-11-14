"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Projecao } from "@/lib/dominio/carteira";
import { useCoresTema } from "@/components/useCoresTema";
import { COR } from "@/components/paleta";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compacto = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : String(Math.round(v)));
const mesCurto = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", "");

// Projeção do patrimônio repetindo o ritmo do seu histórico (rentabilidade e aportes médios).
export function ProjecaoCarteira({ projecao }: { projecao: Projecao }) {
  const tema = useCoresTema();
  const [horizonte, setHorizonte] = useState<12 | 24>(12);
  const pontos = projecao.pontos.slice(0, horizonte + 1).map((p) => ({ ...p, faixa: [p.pessimista, p.otimista] as [number, number] }));
  const fim = pontos.at(-1)!;
  const inicio = pontos[0];

  return (
    <div className="painel flex flex-col gap-4 p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="degrade-ativo flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">Projeção pelo seu histórico</h2>
            <p className="text-xs text-suave">
              Repetindo {projecao.taxaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ao mês (média de {projecao.mesesHistorico} meses) e aportes de {brl(projecao.aporteMensal)} por mês
            </p>
          </div>
        </div>
        <div className="flex rounded-full border border-linha bg-superficie-2 p-1" role="radiogroup" aria-label="Horizonte">
          {([12, 24] as const).map((h) => (
            <button key={h} type="button" role="radio" aria-checked={horizonte === h} onClick={() => setHorizonte(h)} className={`min-h-8 rounded-full px-3.5 text-xs font-semibold ${horizonte === h ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}>
              {h} meses
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-superficie-2/60 p-3">
          <p className="text-[11px] text-suave">Hoje</p>
          <p className="font-display text-base font-semibold tabular-nums text-texto sm:text-lg">{brl(inicio.base)}</p>
        </div>
        <div className="degrade-ativo rounded-xl p-3 text-white">
          <p className="text-[11px] text-white/80">Em {horizonte} meses</p>
          <p className="font-display text-base font-semibold tabular-nums sm:text-lg">{brl(fim.base)}</p>
        </div>
        <div className="rounded-xl bg-superficie-2/60 p-3">
          <p className="text-[11px] text-suave">Faixa provável</p>
          <p className="text-xs font-semibold tabular-nums text-texto sm:text-sm">
            {compacto(fim.pessimista)} a {compacto(fim.otimista)}
          </p>
        </div>
      </div>

      <div className="h-60 w-full" role="img" aria-label={`Projeção: de ${brl(inicio.base)} para ${brl(fim.base)} em ${horizonte} meses`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="mes" tickFormatter={mesCurto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tickFormatter={compacto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={56} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(m) => mesCurto(String(m))}
              formatter={(v, n) => [Array.isArray(v) ? `${brl(Number(v[0]))} a ${brl(Number(v[1]))}` : brl(Number(v)), String(n)]}
              contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto, fontSize: 13 }}
            />
            <Area type="monotone" dataKey="faixa" name="Faixa" stroke="none" fill={COR.azulClaro} fillOpacity={0.22} animationDuration={500} />
            <Line type="monotone" dataKey="aplicado" name="Dinheiro aplicado" stroke={COR.pessego} strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={500} />
            <Line type="monotone" dataKey="base" name="Projeção" stroke={COR.azul} strokeWidth={3} dot={false} animationDuration={500} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-suave">Estimativa que repete o passado recente da sua carteira. Rentabilidade passada não garante resultado futuro.</p>
    </div>
  );
}
