"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarReais, nomeMes } from "@/lib/dominio/motor";
import { useCoresTema } from "@/components/useCoresTema";

export function GraficoComposicao({ fatias }: { fatias: { nome: string; valor: number; cor: string }[] }) {
  const dados = fatias.filter((f) => f.valor > 0);
  return (
    <div className="h-44 w-44 shrink-0" role="img" aria-label={`Composição: ${dados.map((d) => `${d.nome} ${formatarReais(d.valor)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="64%" outerRadius="100%" paddingAngle={3} stroke="none" animationDuration={700}>
            {dados.map((d) => (
              <Cell key={d.nome} fill={d.cor} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoEvolucao({ pontos }: { pontos: { mes: string; total: number }[] }) {
  const tema = useCoresTema();
  return (
    <div className="h-48 w-full" role="img" aria-label={`Evolução do patrimônio: ${pontos.map((p) => `${nomeMes(p.mes)} ${formatarReais(p.total, true)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="area-evolucao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8F00" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#FF8F00" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="linha-evolucao" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#FFB800" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={nomeMes} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} padding={{ left: 16, right: 16 }} />
          <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
          <Tooltip
            formatter={(v) => [formatarReais(Number(v)), "Patrimônio"]}
            labelFormatter={(l) => nomeMes(String(l))}
            contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
          />
          <Area type="monotone" dataKey="total" stroke="url(#linha-evolucao)" strokeWidth={3} fill="url(#area-evolucao)" dot={{ r: 3, fill: tema.destaque, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
