"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Info, Plus, Search, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Cartao, TituloSecao } from "@/components/ui";
import { useCoresTema } from "@/components/useCoresTema";
import { base100, estatisticas, porMes, type Candle } from "@/lib/dominio/tecnica";

const CORES = ["#2D5BFF", "#FF8A3D", "#14B8A6", "#EC4899", "#8B5CF6"];
const MAXIMO = 5;
const PERIODOS = [
  { id: "1m", rotulo: "1M", pregoes: 22 },
  { id: "3m", rotulo: "3M", pregoes: 0 },
] as const;

type Ativo = { simbolo: string; pontos: Candle[] };

const nomeAtivo = (s: string) => (s === "^BVSP" ? "Ibovespa" : s);
const pctSinal = (v: number | null, casas = 1) =>
  v === null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const mesCurto = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  return new Date(a, mm - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};
const dataCurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

// Cor da célula: verde para alta, vermelho para queda, mais forte quanto maior a variação.
function corCelula(v: number) {
  const intensidade = Math.min(1, Math.abs(v) / 12);
  return v >= 0 ? `rgba(34, 197, 94, ${0.12 + intensidade * 0.55})` : `rgba(239, 68, 68, ${0.12 + intensidade * 0.55})`;
}

export function Comparador({ iniciais, periodoAnalise }: { iniciais: string[]; periodoAnalise: string }) {
  const tema = useCoresTema();
  const [simbolos, setSimbolos] = useState<string[]>(iniciais);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("3m");

  useEffect(() => {
    // Atualiza o endereço (para compartilhar) sem recarregar a página.
    window.history.replaceState(null, "", `/mercado/comparar?s=${encodeURIComponent(simbolos.join(","))}`);
    if (!simbolos.length) {
      setAtivos([]);
      return;
    }
    const controle = new AbortController();
    setCarregando(true);
    setErro(null);
    fetch(`/api/mercado/comparar?s=${encodeURIComponent(simbolos.join(","))}`, { signal: controle.signal })
      .then(async (r) => {
        const dados = await r.json();
        if (!r.ok) throw new Error(dados.erro ?? "Não foi possível carregar.");
        setAtivos(dados.ativos);
        if (dados.falhas?.length) setErro(`Sem histórico para: ${dados.falhas.map(nomeAtivo).join(", ")}.`);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErro(e.message);
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });
    return () => controle.abort();
  }, [simbolos]);

  const p = PERIODOS.find((x) => x.id === periodo)!;
  const recortados = useMemo(() => ativos.map((a) => ({ ...a, pontos: p.pregoes ? a.pontos.slice(-p.pregoes) : a.pontos })), [ativos, p.pregoes]);

  // Série base 100, alinhada pelas datas em comum.
  const grafico = useMemo(() => {
    const porData = new Map<string, Record<string, number>>();
    for (const a of recortados) {
      for (const ponto of base100(a.pontos)) {
        porData.set(ponto.data, { ...(porData.get(ponto.data) ?? {}), [a.simbolo]: ponto.valor });
      }
    }
    return [...porData.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([data, v]) => ({ data, ...v }));
  }, [recortados]);

  const mensal = useMemo(() => ativos.map((a) => ({ simbolo: a.simbolo, meses: porMes(a.pontos) })), [ativos]);
  const todosMeses = [...new Set(mensal.flatMap((m) => m.meses.map((x) => x.mes)))].sort();
  const resumo = recortados.map((a) => {
    const est = estatisticas(a.pontos);
    const meses = mensal.find((m) => m.simbolo === a.simbolo)?.meses ?? [];
    const melhor = [...meses].sort((x, y) => y.variacaoPct - x.variacaoPct)[0];
    const pior = [...meses].sort((x, y) => x.variacaoPct - y.variacaoPct)[0];
    const ultimo = a.pontos.at(-1)!;
    return { simbolo: a.simbolo, est, melhor, pior, distMax: est ? (ultimo.fechamento / est.maxima - 1) * 100 : null };
  });

  return (
    <div className="flex flex-col gap-6">
      <Cartao className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-texto">
          Ativos comparados <span className="font-normal text-suave">({simbolos.length} de {MAXIMO})</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {simbolos.map((s, i) => (
            <span key={s} className="flex min-h-10 items-center gap-2 rounded-full border border-linha bg-superficie-2 pl-3 pr-1 text-sm font-semibold text-texto">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} aria-hidden="true" />
              <Link href={`/mercado/${encodeURIComponent(s)}`} className="hover:text-ciano">
                {nomeAtivo(s)}
              </Link>
              <button type="button" onClick={() => setSimbolos((l) => l.filter((x) => x !== s))} aria-label={`Remover ${nomeAtivo(s)}`} className="flex h-8 w-8 items-center justify-center rounded-full text-suave hover:bg-superficie hover:text-erro">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          ))}
          {simbolos.length < MAXIMO ? <Adicionar onAdicionar={(s) => setSimbolos((l) => (l.includes(s) ? l : [...l, s]))} temIbov={simbolos.includes("^BVSP")} /> : null}
        </div>
        {erro ? <p className="text-sm text-ambar">{erro}</p> : null}
      </Cartao>

      {ativos.length ? (
        <>
          <Cartao className={`flex flex-col gap-3 transition-opacity ${carregando ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <TituloSecao titulo="Desempenho em base 100" subtitulo="Todos começam em 100: dá para comparar preços muito diferentes" />
              <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label="Período">
                {PERIODOS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={periodo === x.id}
                    onClick={() => setPeriodo(x.id)}
                    className={`min-h-9 min-w-11 rounded-lg px-3 text-xs font-semibold ${periodo === x.id ? "bg-superficie text-texto shadow" : "text-suave"}`}
                  >
                    {x.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80 w-full" role="img" aria-label={`Desempenho comparado: ${resumo.map((r) => `${nomeAtivo(r.simbolo)} ${pctSinal(r.est?.retornoPeriodo ?? null)}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={grafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={tema.linha} strokeDasharray="2 6" vertical={false} />
                  <XAxis dataKey="data" tickFormatter={dataCurta} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <ReferenceLine y={100} stroke={tema.suave} strokeOpacity={0.5} strokeDasharray="4 4" />
                  <Tooltip
                    labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR")}
                    formatter={(v, n) => [`${Number(v).toFixed(1)} (${pctSinal(Number(v) - 100)})`, nomeAtivo(String(n))]}
                    contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
                  />
                  {recortados.map((a) => (
                    <Line
                      key={a.simbolo}
                      type="monotone"
                      dataKey={a.simbolo}
                      name={a.simbolo}
                      stroke={CORES[simbolos.indexOf(a.simbolo) % CORES.length]}
                      strokeWidth={a.simbolo === "^BVSP" ? 2 : 2.5}
                      strokeDasharray={a.simbolo === "^BVSP" ? "6 3" : undefined}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          <Cartao className="flex flex-col gap-3">
            <TituloSecao titulo="Mês a mês" subtitulo="Variação de cada ativo em cada mês (fechamento contra o mês anterior)" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-suave">
                    <th className="px-2 py-1 text-left font-medium">Ativo</th>
                    {todosMeses.map((m) => (
                      <th key={m} className="px-2 py-1 text-center font-medium">
                        {mesCurto(m)}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center font-medium">No período</th>
                  </tr>
                </thead>
                <tbody>
                  {mensal.map((linha) => {
                    const r = resumo.find((x) => x.simbolo === linha.simbolo);
                    const total = estatisticas(ativos.find((a) => a.simbolo === linha.simbolo)!.pontos)?.retornoPeriodo ?? null;
                    return (
                      <tr key={linha.simbolo}>
                        <th scope="row" className="px-2 py-2 text-left font-semibold text-texto">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[simbolos.indexOf(linha.simbolo) % CORES.length] }} aria-hidden="true" />
                            {nomeAtivo(linha.simbolo)}
                          </span>
                        </th>
                        {todosMeses.map((m) => {
                          const mes = linha.meses.find((x) => x.mes === m);
                          const melhorDoMes = mes && mensal.every((o) => (o.meses.find((x) => x.mes === m)?.variacaoPct ?? -Infinity) <= mes.variacaoPct);
                          return (
                            <td
                              key={m}
                              className={`rounded-lg px-2 py-2 text-center font-semibold tabular-nums text-texto ${melhorDoMes && mensal.length > 1 ? "ring-1 ring-texto/40" : ""}`}
                              style={{ background: mes ? corCelula(mes.variacaoPct) : "transparent" }}
                            >
                              {mes ? `${pctSinal(mes.variacaoPct)}${mes.parcial ? "*" : ""}` : "—"}
                            </td>
                          );
                        })}
                        <td className="rounded-lg bg-superficie-2 px-2 py-2 text-center font-bold tabular-nums text-texto">{pctSinal(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-suave">
              * Mês em andamento ou incompleto no histórico disponível ({periodoAnalise}). O contorno marca o ativo que mais subiu (ou menos caiu) em cada mês.
            </p>
          </Cartao>

          <Cartao className="flex flex-col gap-3">
            <TituloSecao titulo="Resumo comparativo" subtitulo={`Período selecionado: ${p.rotulo === "1M" ? "último mês" : periodoAnalise}`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-suave">
                    <th className="py-2 font-medium">Ativo</th>
                    <th className="py-2 text-right font-medium">Variação</th>
                    <th className="py-2 text-right font-medium">Oscilação anual</th>
                    <th className="py-2 text-right font-medium">Maior queda</th>
                    <th className="py-2 text-right font-medium">Da máxima</th>
                    <th className="py-2 text-right font-medium">Melhor mês</th>
                    <th className="py-2 text-right font-medium">Pior mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {resumo.map((r) => (
                    <tr key={r.simbolo}>
                      <td className="py-2 font-semibold text-texto">
                        <Link href={`/mercado/${encodeURIComponent(r.simbolo)}`} className="hover:text-ciano">
                          {nomeAtivo(r.simbolo)}
                        </Link>
                      </td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${(r.est?.retornoPeriodo ?? 0) >= 0 ? "text-menta" : "text-erro"}`}>{pctSinal(r.est?.retornoPeriodo ?? null)}</td>
                      <td className="py-2 text-right tabular-nums text-texto">{r.est ? `${r.est.volatilidadeAnual.toFixed(0)}%` : "—"}</td>
                      <td className="py-2 text-right tabular-nums text-erro">{pctSinal(r.est?.maiorQueda ?? null)}</td>
                      <td className="py-2 text-right tabular-nums text-suave">{pctSinal(r.distMax)}</td>
                      <td className="py-2 text-right tabular-nums text-menta">{r.melhor ? `${mesCurto(r.melhor.mes)} ${pctSinal(r.melhor.variacaoPct)}` : "—"}</td>
                      <td className="py-2 text-right tabular-nums text-erro">{r.pior ? `${mesCurto(r.pior.mes)} ${pctSinal(r.pior.variacaoPct)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="rounded-2xl bg-superficie-2 px-4 py-3 text-sm">
              <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-medium text-ciano">
                <Info className="h-4 w-4" aria-hidden="true" />
                Como ler esta tabela
              </summary>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-suave">
                <li><strong className="text-texto">Oscilação anual:</strong> o quanto o preço costuma variar. Mais oscilação = mais risco, para cima e para baixo.</li>
                <li><strong className="text-texto">Maior queda:</strong> a pior perda do topo até o fundo seguinte no período. Mostra o “susto” que quem tinha o ativo passou.</li>
                <li><strong className="text-texto">Da máxima:</strong> quanto o preço atual está abaixo do maior preço do período.</li>
                <li>Variações passadas não se repetem necessariamente. Use a comparação para estudar comportamento, não para escolher o que comprar.</li>
              </ul>
            </details>
          </Cartao>
        </>
      ) : carregando ? (
        <div className="h-80 animate-pulse rounded-2xl bg-superficie" />
      ) : (
        <p className="rounded-2xl border border-dashed border-linha px-6 py-10 text-center text-sm text-suave">Adicione até {MAXIMO} ativos para comparar.</p>
      )}
    </div>
  );
}

function Adicionar({ onAdicionar, temIbov }: { onAdicionar: (s: string) => void; temIbov: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<{ simbolo: string; nome: string }[]>([]);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }
    const controle = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/mercado/busca?q=${encodeURIComponent(termo)}`, { signal: controle.signal });
        if (r.ok) setResultados((await r.json()).resultados ?? []);
      } catch {
        // busca opcional
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controle.abort();
    };
  }, [q]);

  function escolher(s: string) {
    onAdicionar(s.toUpperCase());
    setQ("");
    setAberto(false);
  }

  if (!aberto) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => setAberto(true)} className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-linha px-3 text-sm font-medium text-texto hover:border-ciano">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar ativo
        </button>
        {!temIbov ? (
          <button type="button" onClick={() => escolher("^BVSP")} className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-linha px-3 text-sm font-medium text-suave hover:border-ciano hover:text-texto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ibovespa
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" aria-hidden="true" />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && /^[A-Za-z]{4}\d{1,2}$/.test(q.trim())) escolher(q.trim());
          if (e.key === "Escape") setAberto(false);
        }}
        placeholder="Código ou nome (ex.: VALE3)"
        aria-label="Buscar ativo para comparar"
        className="min-h-10 w-full rounded-full border border-ciano bg-superficie-2 pl-9 pr-3 text-sm text-texto outline-none"
      />
      {resultados.length ? (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-linha bg-superficie shadow-xl">
          {resultados.map((r) => (
            <li key={r.simbolo}>
              <button type="button" onClick={() => escolher(r.simbolo)} className="flex min-h-11 w-full items-center gap-3 px-3 text-left hover:bg-superficie-2">
                <span className="w-16 font-semibold text-texto">{r.simbolo}</span>
                <span className="truncate text-xs text-suave">{r.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
