"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { nomeMes, type Categoria, type LinhaDRE } from "@/lib/dominio/financas";
import { brl } from "@/components/financas/formato";

const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Demonstrativo de resultado pessoal: receitas, despesas essenciais e variáveis, o resultado
// (lucro) com margem, os aportes e o caixa livre. Três meses lado a lado no computador;
// no celular, o mês escolhido com a análise vertical e a variação.
export function DRE({ linhas, meses, categorias, aoEscolherCategoria }: { linhas: LinhaDRE[]; meses: string[]; categorias: Categoria[]; aoEscolherCategoria: (id: string) => void }) {
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const atual = meses.length - 1;
  const receita = linhas.find((l) => l.id === "receitas")?.valores ?? [];
  const resultado = linhas.find((l) => l.id === "resultado")?.valores ?? [];

  // Cada item pertence ao último grupo que aparece antes dele.
  let grupo = "";
  const visiveis = linhas.map((l) => {
    if (l.tipo !== "item") grupo = l.id;
    return { ...l, grupo: l.tipo === "item" ? grupo : l.id };
  });

  const margens = meses.map((_, i) => (receita[i] > 0 ? (resultado[i] / receita[i]) * 100 : null));
  const cor = (id?: string) => categorias.find((c) => c.id === id)?.cor ?? "#94A3B8";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-linha text-[11px] uppercase tracking-wider text-suave">
            <th className="px-5 py-2.5 text-left font-semibold">Conta</th>
            {meses.map((m, i) => (
              <th key={m} className={`px-3 py-2.5 text-right font-semibold ${i < atual ? "hidden md:table-cell" : "text-texto"}`}>
                {nomeMes(m, true)}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right font-semibold" title="Análise vertical: quanto cada linha representa das receitas do mês">
              % rec.
            </th>
            <th className="hidden px-5 py-2.5 text-right font-semibold sm:table-cell" title="Variação em relação ao mês anterior">
              Var.
            </th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((l) => {
            if (l.tipo === "item" && fechados[l.grupo]) return null;
            const v = l.valores[atual];
            const antes = l.valores[atual - 1] ?? 0;
            const variacao = antes ? ((v - antes) / Math.abs(antes)) * 100 : null;
            const av = receita[atual] > 0 ? (v / receita[atual]) * 100 : null;
            const bomSubir = l.sinal === 1;
            const negativo = (l.tipo === "resultado" || l.tipo === "destaque") && v < 0;
            const estilo =
              l.tipo === "destaque"
                ? "bg-ciano/8 font-display text-[15px] font-black"
                : l.tipo === "resultado"
                  ? "bg-superficie-2/50 font-bold"
                  : l.tipo === "grupo"
                    ? "font-semibold"
                    : "text-[13px]";
            const temItens = l.tipo === "grupo" && visiveis.some((x) => x.tipo === "item" && x.grupo === l.id);
            return (
              <tr key={l.id} className={`border-b border-linha/70 ${estilo}`}>
                <td className={`py-2.5 pr-3 ${l.tipo === "item" ? "pl-9" : "pl-5"}`}>
                  {temItens ? (
                    <button type="button" onClick={() => setFechados((f) => ({ ...f, [l.id]: !f[l.id] }))} className="flex items-center gap-1.5 text-left text-texto" aria-expanded={!fechados[l.id]}>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-suave transition-transform ${fechados[l.id] ? "-rotate-90" : ""}`} aria-hidden="true" />
                      {l.rotulo}
                    </button>
                  ) : l.tipo === "item" && l.categoriaId ? (
                    <button type="button" onClick={() => aoEscolherCategoria(l.categoriaId!)} className="flex items-center gap-2 text-left text-texto hover:text-ciano" title="Ver os lançamentos desta categoria">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor(l.categoriaId) }} aria-hidden="true" />
                      {l.rotulo}
                    </button>
                  ) : (
                    <span className={l.tipo === "destaque" ? "text-texto" : "text-texto"}>{l.rotulo}</span>
                  )}
                </td>
                {l.valores.map((valor, i) => (
                  <td key={i} className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums ${i < atual ? "hidden text-suave md:table-cell" : ""} ${(l.tipo === "resultado" || l.tipo === "destaque") && valor < 0 ? "text-erro" : l.tipo === "destaque" ? "text-ciano" : i === atual ? "text-texto" : ""}`}>
                    {l.sinal === -1 && valor ? "−" : valor < 0 ? "−" : ""}
                    {brl(Math.abs(valor))}
                  </td>
                ))}
                <td className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums ${negativo ? "text-erro" : "text-suave"}`}>{pct(av)}</td>
                <td className="hidden whitespace-nowrap px-5 py-2.5 text-right tabular-nums sm:table-cell">
                  {variacao === null || Math.abs(variacao) < 0.5 ? (
                    <span className="text-suave">—</span>
                  ) : (
                    <span className={(bomSubir ? variacao > 0 : variacao < 0) ? "text-menta" : "text-erro"}>
                      {variacao > 0 ? "+" : "−"}
                      {Math.abs(Math.round(variacao))}%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="text-[13px]">
            <td className="py-2.5 pl-5 pr-3 font-semibold text-texto">Margem (lucro ÷ receitas)</td>
            {margens.map((m, i) => (
              <td key={i} className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${i < atual ? "hidden text-suave md:table-cell" : m !== null && m < 0 ? "text-erro" : "text-texto"}`}>
                {pct(m)}
              </td>
            ))}
            <td className="px-3 py-2.5" />
            <td className="hidden px-5 py-2.5 sm:table-cell" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
