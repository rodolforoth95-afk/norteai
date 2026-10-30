"use client";

import Link from "next/link";
import { useState } from "react";
import { CandlestickChart } from "lucide-react";
import { Cartao, TituloSecao } from "@/components/ui";
import { LogoAtivo } from "@/components/mercado";

export type ItemMapa = { simbolo: string; nome: string; logo: string | null; variacaoPct: number; preco: number };
export type GrupoMapa = { id: string; rotulo: string; descricao: string; total: number; itens: ItemMapa[] };

const ORDENS = [
  { id: "volume", rotulo: "Mais negociados" },
  { id: "altas", rotulo: "Maiores altas" },
  { id: "baixas", rotulo: "Maiores baixas" },
] as const;
const QUANTIDADES = [24, 48];

const sinal = (v: number, casas = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;

function cor(v: number) {
  const forca = Math.min(1, Math.abs(v) / 4);
  return v >= 0 ? `rgba(34, 197, 94, ${0.18 + forca * 0.6})` : `rgba(239, 68, 68, ${0.18 + forca * 0.6})`;
}

function resumo(itens: ItemMapa[]) {
  const altas = itens.filter((i) => i.variacaoPct > 0).length;
  const media = itens.length ? itens.reduce((s, i) => s + i.variacaoPct, 0) / itens.length : 0;
  return { altas, quedas: itens.filter((i) => i.variacaoPct < 0).length, media };
}

// Mapa de calor do dia, com seletor de tipo (ações, FIIs, ETFs, BDRs) que também
// compara como cada tipo se saiu hoje.
export function MapaDoDia({ grupos }: { grupos: GrupoMapa[] }) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id);
  const [ordem, setOrdem] = useState<(typeof ORDENS)[number]["id"]>("volume");
  const [quantidade, setQuantidade] = useState(24);
  const grupo = grupos.find((g) => g.id === grupoId) ?? grupos[0];
  if (!grupo) return null;

  const ordenados =
    ordem === "volume" ? grupo.itens : [...grupo.itens].sort((a, b) => (ordem === "altas" ? b.variacaoPct - a.variacaoPct : a.variacaoPct - b.variacaoPct));
  const visiveis = ordenados.slice(0, quantidade);
  const r = resumo(grupo.itens);

  return (
    <Cartao className="flex flex-col gap-4">
      <TituloSecao titulo="Mapa do dia" subtitulo="Escolha o tipo de ativo e compare como cada um se saiu hoje" />

      {/* Seletor + comparativo entre tipos */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="radiogroup" aria-label="Tipo de ativo">
        {grupos.map((g) => {
          const rg = resumo(g.itens);
          const ativo = g.id === grupo.id;
          const pctAlta = g.itens.length ? (rg.altas / g.itens.length) * 100 : 0;
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => setGrupoId(g.id)}
              className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition ${ativo ? "border-ciano bg-ciano/10" : "border-linha bg-superficie-2/40 hover:border-violeta"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-texto">{g.rotulo}</span>
                <span className={`text-sm font-bold tabular-nums ${rg.media >= 0 ? "text-menta" : "text-erro"}`}>{sinal(rg.media, 2)}</span>
              </span>
              <span className="flex h-1.5 overflow-hidden rounded-full bg-erro/60" aria-hidden="true">
                <span className="bg-menta" style={{ width: `${pctAlta}%` }} />
              </span>
              <span className="text-[11px] text-suave">
                {rg.altas} em alta · {rg.quedas} em queda · {g.total.toLocaleString("pt-BR")} na B3
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label="Ordenar">
          {ORDENS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={ordem === o.id}
              onClick={() => setOrdem(o.id)}
              className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${ordem === o.id ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label="Quantidade">
          {QUANTIDADES.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quantidade === q}
              onClick={() => setQuantidade(q)}
              className={`min-h-9 min-w-11 rounded-lg px-3 text-xs font-semibold ${quantidade === q ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-suave">
        {grupo.descricao} Variação média de hoje: <span className={`font-semibold ${r.media >= 0 ? "text-menta" : "text-erro"}`}>{sinal(r.media, 2)}</span>.
      </p>

      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {visiveis.map((a) => (
          <li key={a.simbolo}>
            <Link
              href={`/mercado/${a.simbolo}`}
              title={a.nome}
              className="flex min-h-24 flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition hover:ring-2 hover:ring-texto/40"
              style={{ background: cor(a.variacaoPct) }}
            >
              <LogoAtivo simbolo={a.simbolo} logo={a.logo} tamanho={30} />
              <span className="mt-1 font-display text-sm font-bold text-texto">{a.simbolo}</span>
              <span className="text-xs font-semibold tabular-nums text-texto">{sinal(a.variacaoPct)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-[11px] text-suave">
        <CandlestickChart className="h-3.5 w-3.5" aria-hidden="true" />
        Quanto mais forte a cor, maior a variação. Toque para ver o gráfico com suportes e resistências. Mostra só o movimento do dia, não é indicação.
      </p>
    </Cartao>
  );
}
