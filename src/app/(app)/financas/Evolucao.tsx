"use client";

import { ArrowDownRight, ArrowUpRight, CalendarCheck, PiggyBank, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { nomeMes, type Evolucao as DadosEvolucao } from "@/lib/dominio/financas";
import { useCoresTema } from "@/components/useCoresTema";
import { COR } from "@/components/paleta";
import { brl0 } from "@/components/financas/formato";

const compacto = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const NIVEL = {
  otimo: { rotulo: "Excelente", texto: "Você está avançando: sobra dinheiro todo mês e os gastos estão sob controle.", cor: COR.azul },
  caminho: { rotulo: "No caminho", texto: "Há sobra, mas ainda dá para ganhar folga. Veja os pontos abaixo.", cor: COR.azulMedio },
  atencao: { rotulo: "Atenção", texto: "As saídas estão perto ou acima das entradas. O plano do Mordomo mostra onde ajustar.", cor: COR.laranja },
} as const;

// Painéis de evolução: pontuação de saúde financeira, taxa de poupança, sobra acumulada
// e a composição das despesas, para mostrar se a pessoa está avançando mês a mês.
export function Evolucao({ dados }: { dados: DadosEvolucao }) {
  const tema = useCoresTema();
  const nivel = NIVEL[dados.nivel];
  const comDados = dados.meses.filter((m) => m.receitas + m.despesas > 0);
  const ultimo = comDados.at(-1);
  const dicaTooltip = { background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto, fontSize: 13 };
  const eixo = { fill: tema.suave, fontSize: 11 };

  return (
    <section className="flex flex-col gap-4 lg:gap-6" aria-labelledby="titulo-evolucao">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-evolucao" className="font-display text-lg font-semibold text-texto">
            Sua evolução
          </h2>
          <p className="text-xs text-suave">Últimos 6 meses · o mês atual ainda está em andamento</p>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Indicador
          Icone={PiggyBank}
          rotulo="Taxa de poupança"
          valor={dados.taxaMedia === null ? "—" : `${Math.round(dados.taxaMedia)}%`}
          detalhe="média dos meses"
          tendencia={dados.variacaoTaxa === null ? null : { valor: `${dados.variacaoTaxa >= 0 ? "+" : "−"}${Math.abs(Math.round(dados.variacaoTaxa))} p.p.`, bom: dados.variacaoTaxa >= 0 }}
        />
        <Indicador Icone={TrendingUp} rotulo="Sobra acumulada" valor={brl0(ultimo?.acumulado ?? 0)} detalhe="soma dos meses" tendencia={null} />
        <Indicador Icone={CalendarCheck} rotulo="Meses no azul" valor={`${dados.mesesPositivos} de ${comDados.length}`} detalhe="entradas maiores que saídas" tendencia={null} />
        <Indicador
          Icone={dados.variacaoVariaveis !== null && dados.variacaoVariaveis <= 0 ? ArrowDownRight : ArrowUpRight}
          rotulo="Gastos variáveis"
          valor={dados.variacaoVariaveis === null ? "—" : Math.abs(dados.variacaoVariaveis) < 1 ? "0%" : `${dados.variacaoVariaveis < 0 ? "−" : "+"}${Math.abs(Math.round(dados.variacaoVariaveis))}%`}
          detalhe="vs. 3 meses anteriores"
          tendencia={dados.variacaoVariaveis === null ? null : Math.abs(dados.variacaoVariaveis) < 1 ? { valor: "estável", bom: true } : { valor: dados.variacaoVariaveis < 0 ? "caindo" : "subindo", bom: dados.variacaoVariaveis < 0 }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-6">
        {/* Saúde financeira */}
        <div className="painel flex flex-col gap-4 p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-texto">Saúde financeira</h3>
            <p className="text-xs text-suave">De 0 a 100, pelos últimos 3 meses</p>
          </div>
          <Medidor pontos={dados.pontuacao} cor={nivel.cor} rotulo={nivel.rotulo} />
          <p className="-mt-1 text-center text-[13px] leading-relaxed text-suave">{nivel.texto}</p>
          <ul className="flex flex-col gap-3">
            {dados.partes.map((p) => (
              <li key={p.id} title={p.dica}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-medium text-texto">{p.rotulo}</span>
                  <span className="font-mono text-xs tabular-nums text-suave">
                    {p.pontos}/{p.maximo}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-superficie-2">
                  <div className="degrade-ativo h-full rounded-full" style={{ width: `${Math.max(3, (p.pontos / p.maximo) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-suave">{p.dica}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          {/* Taxa de poupança */}
          <div className="painel flex min-w-0 flex-col gap-3 p-5">
            <div>
              <h3 className="font-display text-base font-semibold text-texto">Taxa de poupança</h3>
              <p className="text-xs text-suave">Quanto das receitas sobrou em cada mês · referência de 20%</p>
            </div>
            <div className="h-48 w-full" role="img" aria-label={`Taxa de poupança: média de ${Math.round(dados.taxaMedia ?? 0)}%`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dados.meses} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="area-poupanca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COR.azul} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COR.azul} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="mes" tickFormatter={(m) => nomeMes(String(m), true)} tick={eixo} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={eixo} axisLine={false} tickLine={false} width={44} />
                  <ReferenceLine y={20} stroke={COR.laranja} strokeDasharray="5 5" label={{ value: "20%", position: "insideTopRight", fill: COR.laranja, fontSize: 11 }} />
                  <Tooltip labelFormatter={(m) => nomeMes(String(m))} formatter={(v) => [v === null ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, "Taxa de poupança"]} contentStyle={dicaTooltip} />
                  <Area type="monotone" dataKey="taxaPoupanca" stroke={COR.azul} strokeWidth={2.5} fill="url(#area-poupanca)" connectNulls dot={{ r: 3, fill: COR.azul, strokeWidth: 0 }} animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
            {/* Sobra e acumulado */}
            <div className="painel flex min-w-0 flex-col gap-3 p-5">
              <div>
                <h3 className="font-display text-base font-semibold text-texto">Sobra mês a mês</h3>
                <p className="text-xs text-suave">Barras: sobra do mês · linha: acumulado</p>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados.meses} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="mes" tickFormatter={(m) => nomeMes(String(m), true)} tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compacto} tick={eixo} axisLine={false} tickLine={false} width={50} />
                    <ReferenceLine y={0} stroke={tema.suave} strokeOpacity={0.4} />
                    <Tooltip labelFormatter={(m) => nomeMes(String(m))} formatter={(v, n) => [brl0(Number(v)), String(n)]} contentStyle={dicaTooltip} cursor={{ fill: tema.superficie2, opacity: 0.5 }} />
                    <Bar dataKey="saldo" name="Sobra do mês" radius={[6, 6, 6, 6]} maxBarSize={22} animationDuration={500}>
                      {dados.meses.map((m) => (
                        <Cell key={m.mes} fill={m.saldo >= 0 ? COR.azul : COR.laranja} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke={COR.ceu} strokeWidth={2.5} dot={false} animationDuration={500} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Essencial x variável */}
            <div className="painel flex min-w-0 flex-col gap-3 p-5">
              <div>
                <h3 className="font-display text-base font-semibold text-texto">Para onde vai a renda</h3>
                <p className="text-xs text-suave">Essencial, variável e o que sobra</p>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.meses.map((m) => ({ ...m, sobra: Math.max(0, m.saldo) }))} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="mes" tickFormatter={(m) => nomeMes(String(m), true)} tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compacto} tick={eixo} axisLine={false} tickLine={false} width={50} />
                    <Tooltip labelFormatter={(m) => nomeMes(String(m))} formatter={(v, n) => [brl0(Number(v)), String(n)]} contentStyle={dicaTooltip} cursor={{ fill: tema.superficie2, opacity: 0.5 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: tema.suave }} />
                    <Bar dataKey="essenciais" name="Essencial" stackId="r" fill={COR.azul} maxBarSize={26} animationDuration={500} />
                    <Bar dataKey="variaveis" name="Variável" stackId="r" fill={COR.pessego} maxBarSize={26} animationDuration={500} />
                    <Bar dataKey="sobra" name="Sobra" stackId="r" fill={COR.azulGelo} radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Indicador({ Icone, rotulo, valor, detalhe, tendencia }: { Icone: typeof PiggyBank; rotulo: string; valor: string; detalhe: string; tendencia: { valor: string; bom: boolean } | null }) {
  return (
    <div className="painel flex min-w-0 items-start gap-3 p-4">
      <span className="degrade-ativo flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
        <Icone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-suave">{rotulo}</p>
        <p className="flex items-baseline gap-1.5">
          <span className="truncate font-display text-xl font-semibold tabular-nums text-texto">{valor}</span>
          {tendencia ? <span className={`shrink-0 text-[11px] font-semibold ${tendencia.bom ? "text-menta" : "text-erro"}`}>{tendencia.valor}</span> : null}
        </p>
        <p className="truncate text-[11px] text-suave">{detalhe}</p>
      </div>
    </div>
  );
}

// Medidor em meio círculo com degradê da marca.
function Medidor({ pontos, cor, rotulo }: { pontos: number; cor: string; rotulo: string }) {
  const raio = 80;
  const meia = Math.PI * raio;
  return (
    <div className="relative mx-auto h-[110px] w-[200px]" role="meter" aria-valuenow={pontos} aria-valuemin={0} aria-valuemax={100} aria-label={`Saúde financeira: ${pontos} de 100, ${rotulo}`}>
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="medidor-degrade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COR.laranja} />
            <stop offset="50%" stopColor={COR.azulClaro} />
            <stop offset="100%" stopColor={COR.azul} />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--superficie-2)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#medidor-degrade)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={meia}
          strokeDashoffset={meia * (1 - pontos / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="font-display text-4xl font-semibold tabular-nums leading-none text-texto">{pontos}</span>
        <span className="mt-1 text-xs font-semibold" style={{ color: cor }}>
          {rotulo}
        </span>
      </div>
    </div>
  );
}
