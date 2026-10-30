"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

// Gráfico compacto, sem eixos, para o cartão do Ibovespa.
export function MiniGrafico({ pontos }: { pontos: { data: string; fechamento: number }[] }) {
  const sobe = pontos[pontos.length - 1].fechamento >= pontos[0].fechamento;
  const cor = sobe ? "#22C55E" : "#EF4444";
  return (
    <div className="relative mt-3 h-20 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mini-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="fechamento" stroke={cor} strokeWidth={2} fill="url(#mini-area)" animationDuration={1100} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
