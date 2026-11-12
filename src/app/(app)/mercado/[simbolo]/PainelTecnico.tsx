"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, CandlestickChart, Info, LineChart as IconeLinha, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Area, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Cartao, TituloSecao } from "@/components/ui";
import { useCoresTema } from "@/components/useCoresTema";
import {
  ROTULO_ORIGEM,
  estatisticas,
  mediaMovel,
  porMes,
  type Candle,
  type Leitura,
  type Nivel,
} from "@/lib/dominio/tecnica";

const VERDE = "#22C55E";
const VERMELHO = "#EF4444";
const COR_SUPORTE = "#22C55E";
const COR_RESISTENCIA = "#F97316";
const COR_PIVO = "#A78BFA";
const COR_MM9 = "#60A5FA";
const COR_MM21 = "#F472B6";

const PERIODOS = [
  { id: "1m", rotulo: "1M", pregoes: 22 },
  { id: "3m", rotulo: "3M", pregoes: 0 },
] as const;

type Camada = "volume" | "mm9" | "mm21";

const dataCurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const dataLonga = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const nomeMes = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  const t = new Date(a, mm - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const pctSinal = (v: number | null, casas = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const tom = (v: number | null) => (v === null ? "text-suave" : v > 0 ? "text-menta" : v < 0 ? "text-erro" : "text-texto");
const compacto = (v: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export function PainelTecnico({
  simbolo,
  indice,
  candles,
  niveis,
  pivos,
  leituras,
  periodoAnalise,
}: {
  simbolo: string;
  indice: boolean;
  candles: Candle[];
  niveis: Nivel[];
  pivos: Nivel[];
  leituras: Leitura[];
  periodoAnalise: string;
}) {
  const tema = useCoresTema();
  const preco = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : indice ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts` : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("3m");
  const [tipo, setTipo] = useState<"candles" | "linha">("candles");
  const [camadas, setCamadas] = useState<Record<Camada, boolean>>({ volume: true, mm9: false, mm21: true });
  const todos = useMemo(() => [...niveis, ...pivos], [niveis, pivos]);
  // Começa mostrando o suporte e a resistência mais próximos.
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(niveis.filter((n) => n.id.endsWith("-1")).map((n) => n.id)));
  const [foco, setFoco] = useState<number | null>(null);

  const mm9 = useMemo(() => mediaMovel(candles, 9), [candles]);
  const mm21 = useMemo(() => mediaMovel(candles, 21), [candles]);
  const meses = useMemo(() => porMes(candles), [candles]);

  const p = PERIODOS.find((x) => x.id === periodo)!;
  const inicio = p.pregoes ? Math.max(0, candles.length - p.pregoes) : 0;
  const visiveis = candles.slice(inicio);
  const est = estatisticas(visiveis);
  const atual = candles.at(-1)!;

  const dados = visiveis.map((c, k) => ({
    ...c,
    faixa: [c.minima, c.maxima] as [number, number],
    alta: c.fechamento >= c.abertura,
    mm9: mm9[inicio + k],
    mm21: mm21[inicio + k],
  }));
  const linhasVisiveis = todos.filter((n) => selecionados.has(n.id));
  const precos = [...visiveis.flatMap((c) => [c.minima, c.maxima]), ...linhasVisiveis.map((n) => n.preco)];
  const minY = Math.min(...precos);
  const maxY = Math.max(...precos);
  const folga = (maxY - minY) * 0.06;
  const maxVolume = Math.max(...visiveis.map((c) => c.volume), 1);
  const focado = foco !== null ? dados[foco] : dados.at(-1)!;
  const anterior = foco !== null && foco > 0 ? dados[foco - 1] : dados.at(-2);
  const varFoco = anterior ? (focado.fechamento / anterior.fechamento - 1) * 100 : null;

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const resistencias = todos.filter((n) => n.tipo === "resistencia").sort((a, b) => b.preco - a.preco);
  const suportes = todos.filter((n) => n.tipo === "suporte").sort((a, b) => b.preco - a.preco);
  const corNivel = (n: Nivel) => (n.origem === "pivo" ? COR_PIVO : n.tipo === "suporte" ? COR_SUPORTE : COR_RESISTENCIA);

  return (
    <div className="flex flex-col gap-6">
      {/* Gráfico */}
      <Cartao className="flex flex-col gap-3 !p-4 lg:!p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div aria-live="polite">
            <p className="text-xs text-suave">{dataLonga(focado.data)}</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-texto">
              {preco(focado.fechamento)} <span className={`text-sm font-semibold ${tom(varFoco)}`}>{pctSinal(varFoco, 2)}</span>
            </p>
            <p className="text-[11px] tabular-nums text-suave">
              Abertura {preco(focado.abertura)} · Máx. {preco(focado.maxima)} · Mín. {preco(focado.minima)} · Vol. {compacto(focado.volume)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Segmentos
              rotulo="Tipo de gráfico"
              opcoes={[
                { id: "candles", rotulo: "Candles", Icone: CandlestickChart },
                { id: "linha", rotulo: "Linha", Icone: IconeLinha },
              ]}
              valor={tipo}
              onChange={(v) => setTipo(v as typeof tipo)}
            />
            <Segmentos rotulo="Período" opcoes={PERIODOS.map((x) => ({ id: x.id, rotulo: x.rotulo }))} valor={periodo} onChange={(v) => setPeriodo(v as typeof periodo)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["mm9", "Média 9 dias", COR_MM9],
              ["mm21", "Média 21 dias", COR_MM21],
              ["volume", "Volume", tema.suave],
            ] as [Camada, string, string][]
          ).map(([id, rotulo, cor]) => (
            <Chip key={id} ativo={camadas[id]} cor={cor} onClick={() => setCamadas((c) => ({ ...c, [id]: !c[id] }))}>
              {rotulo}
            </Chip>
          ))}
          <span className="mx-1 hidden h-8 w-px bg-linha sm:block" aria-hidden="true" />
          <Chip
            ativo={niveis.some((n) => n.tipo === "suporte" && selecionados.has(n.id))}
            cor={COR_SUPORTE}
            onClick={() => {
              const ids = niveis.filter((n) => n.tipo === "suporte").map((n) => n.id);
              const algum = ids.some((id) => selecionados.has(id));
              setSelecionados((s) => {
                const n = new Set(s);
                ids.forEach((id) => (algum ? n.delete(id) : n.add(id)));
                return n;
              });
            }}
          >
            Suportes
          </Chip>
          <Chip
            ativo={niveis.some((n) => n.tipo === "resistencia" && selecionados.has(n.id))}
            cor={COR_RESISTENCIA}
            onClick={() => {
              const ids = niveis.filter((n) => n.tipo === "resistencia").map((n) => n.id);
              const algum = ids.some((id) => selecionados.has(id));
              setSelecionados((s) => {
                const n = new Set(s);
                ids.forEach((id) => (algum ? n.delete(id) : n.add(id)));
                return n;
              });
            }}
          >
            Resistências
          </Chip>
          <Chip
            ativo={pivos.some((n) => selecionados.has(n.id))}
            cor={COR_PIVO}
            onClick={() => {
              const algum = pivos.some((n) => selecionados.has(n.id));
              setSelecionados((s) => {
                const n = new Set(s);
                pivos.forEach((x) => (algum ? n.delete(x.id) : n.add(x.id)));
                return n;
              });
            }}
          >
            Pivôs
          </Chip>
        </div>

        <div className="h-80 w-full touch-pan-y lg:h-[26rem]" role="img" aria-label={`Gráfico de ${simbolo}: ${dados.length} pregões, de ${preco(dados[0]?.fechamento)} para ${preco(atual.fechamento)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dados}
              margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              barCategoryGap="18%"
              onMouseMove={(e) => {
                const i = Number(e?.activeIndex);
                setFoco(Number.isFinite(i) ? i : null);
              }}
              onMouseLeave={() => setFoco(null)}
            >
              <defs>
                <linearGradient id="area-tecnica" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tema.destaque} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={tema.destaque} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={tema.linha} strokeDasharray="2 6" vertical={false} />
              <XAxis dataKey="data" tickFormatter={dataCurta} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis
                yAxisId="preco"
                orientation="right"
                domain={[minY - folga, maxY + folga]}
                tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: indice ? 0 : 2 })}
                tick={{ fill: tema.suave, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={indice ? 64 : 48}
              />
              <YAxis yAxisId="volume" hide domain={[0, maxVolume * 4.5]} />
              <Tooltip content={() => null} cursor={{ stroke: tema.suave, strokeWidth: 1, strokeDasharray: "3 3" }} />

              {camadas.volume ? (
                <Bar yAxisId="volume" dataKey="volume" isAnimationActive={false} maxBarSize={10}>
                  {dados.map((d) => (
                    <Cell key={d.data} fill={d.alta ? VERDE : VERMELHO} fillOpacity={0.25} />
                  ))}
                </Bar>
              ) : null}

              {tipo === "candles" ? (
                <Bar yAxisId="preco" dataKey="faixa" isAnimationActive={false} maxBarSize={12} shape={<FormaCandle />} />
              ) : (
                <Area yAxisId="preco" type="monotone" dataKey="fechamento" stroke={tema.destaque} strokeWidth={2.5} fill="url(#area-tecnica)" dot={false} isAnimationActive={false} />
              )}

              {camadas.mm9 ? <Line yAxisId="preco" type="monotone" dataKey="mm9" stroke={COR_MM9} strokeWidth={1.6} dot={false} connectNulls isAnimationActive={false} /> : null}
              {camadas.mm21 ? <Line yAxisId="preco" type="monotone" dataKey="mm21" stroke={COR_MM21} strokeWidth={1.6} dot={false} connectNulls isAnimationActive={false} /> : null}

              {linhasVisiveis.map((n) => (
                <ReferenceLine
                  key={n.id}
                  yAxisId="preco"
                  y={n.preco}
                  stroke={corNivel(n)}
                  strokeDasharray={n.origem === "pivo" ? "2 4" : "6 4"}
                  strokeWidth={n.forca === "forte" ? 2 : 1.4}
                  label={{ value: `${n.rotulo.replace("Resistência", "R").replace("Suporte", "S")} ${n.preco.toLocaleString("pt-BR", { maximumFractionDigits: indice ? 0 : 2 })}`, position: "insideTopLeft", fill: corNivel(n), fontSize: 10 }}
                />
              ))}
              <ReferenceLine yAxisId="preco" y={atual.fechamento} stroke={tema.texto} strokeOpacity={0.5} strokeDasharray="1 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-suave">
          Candle verde: fechou acima da abertura; vermelho: abaixo. As linhas tracejadas são regiões de preço calculadas a partir dos topos e fundos dos últimos {periodoAnalise}. A linha pontilhada clara é o preço atual.
        </p>
      </Cartao>

      {/* Escada de níveis */}
      <div className="grid gap-6 2xl:grid-cols-[1.4fr_1fr]">
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Suportes e resistências" subtitulo="Marque os níveis para vê-los no gráfico" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm [&_td]:px-2 [&_th]:whitespace-nowrap [&_th]:px-2">
              <thead>
                <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-suave">
                  <th className="py-2 pl-1 font-medium">
                    <span className="sr-only">Mostrar no gráfico</span>
                  </th>
                  <th className="py-2 font-medium">Nível</th>
                  <th className="py-2 text-right font-medium">Preço</th>
                  <th className="py-2 text-right font-medium">Distância</th>
                  <th className="py-2 text-center font-medium">Toques</th>
                  <th className="py-2 font-medium">Força</th>
                  <th className="py-2 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {resistencias.map((n) => (
                  <LinhaNivel key={n.id} n={n} cor={corNivel(n)} marcado={selecionados.has(n.id)} onAlternar={() => alternar(n.id)} preco={preco} />
                ))}
                <tr className="bg-ciano/10">
                  <td className="py-2 pl-1" />
                  <td className="py-2 font-semibold text-texto" colSpan={2}>
                    Preço atual · {preco(atual.fechamento)}
                  </td>
                  <td className="py-2 text-right text-xs text-suave" colSpan={4}>
                    {dataLonga(atual.data)}
                  </td>
                </tr>
                {suportes.map((n) => (
                  <LinhaNivel key={n.id} n={n} cor={corNivel(n)} marcado={selecionados.has(n.id)} onAlternar={() => alternar(n.id)} preco={preco} />
                ))}
              </tbody>
            </table>
          </div>
          <details className="rounded-2xl bg-superficie-2 px-4 py-3 text-sm">
            <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-medium text-ciano">
              <Info className="h-4 w-4" aria-hidden="true" />
              Como calculamos
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-suave">
              <li>
                <strong className="text-texto">Topos e fundos:</strong> pontos em que o preço virou (a máxima ou a mínima mais extrema numa janela de 7 pregões). Regiões
                próximas são agrupadas; cada reação conta como um toque.
              </li>
              <li>
                <strong className="text-texto">Força:</strong> 1 toque = fraca, 2 = moderada, 3 ou mais = forte. Mais toques não garantem que o nível segure.
              </li>
              <li>
                <strong className="text-texto">Pivôs mensais:</strong> fórmula clássica com a máxima, a mínima e o fechamento do último mês completo (PP = (máx + mín + fech) ÷ 3).
              </li>
            </ul>
          </details>
        </Cartao>

        <div className="flex flex-col gap-3">
          <TituloSecao titulo="Pontos para estudar" subtitulo="O que o gráfico mostra hoje e o que analistas costumam observar" />
          {leituras.map((l) => (
            <div key={l.id} className="rounded-2xl border border-linha bg-superficie p-4">
              <p className="flex items-center gap-2 font-semibold text-texto">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${l.tom === "positivo" ? "bg-menta" : l.tom === "negativo" ? "bg-erro" : l.tom === "atencao" ? "bg-ambar" : "bg-suave"}`}
                  aria-hidden="true"
                />
                {l.titulo}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-suave">{l.texto}</p>
              <Link href={`/aprender/${l.aula}`} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-ciano">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Aula relacionada
              </Link>
            </div>
          ))}
          <p className="text-[11px] leading-relaxed text-suave">
            Leituras automáticas e educativas. Análise técnica estuda o comportamento passado do preço e não prevê o futuro. Nada aqui é recomendação de compra ou venda.
          </p>
        </div>
      </div>

      {/* Estatísticas e mês a mês */}
      {est ? (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Variação no período", pctSinal(est.retornoPeriodo), tom(est.retornoPeriodo)],
            ["Oscilação anualizada", `${est.volatilidadeAnual.toFixed(0)}%`, "text-texto"],
            ["Maior queda (topo → fundo)", pctSinal(est.maiorQueda), "text-erro"],
            ["Pregões em alta", `${est.diasAlta.toFixed(0)}%`, "text-texto"],
          ].map(([r, v, c]) => (
            <div key={r} className="rounded-2xl border border-linha bg-superficie p-4">
              <dt className="text-xs text-suave">{r}</dt>
              <dd className={`mt-1 font-display text-xl font-bold tabular-nums ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Mês a mês" subtitulo="Como o preço se comportou em cada mês" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <div className="flex flex-col gap-2">
            {meses.map((m) => {
              const largura = Math.min(100, Math.abs(m.variacaoPct) * 4);
              return (
                <div key={m.mes} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-suave">
                    {nomeMes(m.mes).split(" ")[0]}
                    {m.parcial ? "*" : ""}
                  </span>
                  <span className="relative h-6 flex-1 rounded bg-superficie-2">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-linha" aria-hidden="true" />
                    <span
                      className="absolute inset-y-1 rounded"
                      style={{
                        background: m.variacaoPct >= 0 ? VERDE : VERMELHO,
                        width: `${largura / 2}%`,
                        left: m.variacaoPct >= 0 ? "50%" : `${50 - largura / 2}%`,
                      }}
                      aria-hidden="true"
                    />
                  </span>
                  <span className={`w-16 text-right font-semibold tabular-nums ${tom(m.variacaoPct)}`}>{pctSinal(m.variacaoPct)}</span>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-suave">
                  <th className="py-2 font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Abertura</th>
                  <th className="py-2 text-right font-medium">Fechamento</th>
                  <th className="py-2 text-right font-medium">Máxima</th>
                  <th className="py-2 text-right font-medium">Mínima</th>
                  <th className="py-2 text-right font-medium">Amplitude</th>
                  <th className="py-2 text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {[...meses].reverse().map((m) => (
                  <tr key={m.mes}>
                    <td className="py-2 text-texto">
                      {nomeMes(m.mes)}
                      {m.parcial ? "*" : ""}
                    </td>
                    <td className="py-2 text-right tabular-nums text-suave">{preco(m.abertura)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-texto">{preco(m.fechamento)}</td>
                    <td className="py-2 text-right tabular-nums text-suave">{preco(m.maxima)}</td>
                    <td className="py-2 text-right tabular-nums text-suave">{preco(m.minima)}</td>
                    <td className="py-2 text-right tabular-nums text-suave">{m.amplitudePct.toFixed(1)}%</td>
                    <td className="py-2 text-right tabular-nums text-suave">{compacto(m.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-suave">
          * Mês em andamento ou incompleto no histórico disponível. A variação compara o fechamento com o do mês anterior.{" "}
          <Link href={`/mercado/comparar?s=${encodeURIComponent(simbolo)}`} className="font-semibold text-ciano">
            Comparar {simbolo} com outros ativos
          </Link>
        </p>
      </Cartao>
    </div>
  );
}

// Desenha um candle a partir da barra de mínima → máxima (pavio) e abertura/fechamento (corpo).
function FormaCandle(props: { x?: number; y?: number; width?: number; height?: number; payload?: { abertura: number; fechamento: number; maxima: number; minima: number } }) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { abertura, fechamento, maxima, minima } = payload;
  const alta = fechamento >= abertura;
  const cor = alta ? VERDE : VERMELHO;
  const escala = maxima > minima ? height / (maxima - minima) : 0;
  const topoCorpo = y + (maxima - Math.max(abertura, fechamento)) * escala;
  const alturaCorpo = Math.max(1, Math.abs(fechamento - abertura) * escala);
  const centro = x + width / 2;
  return (
    <g>
      <line x1={centro} x2={centro} y1={y} y2={y + height} stroke={cor} strokeWidth={1.2} />
      <rect x={x + width * 0.1} y={topoCorpo} width={Math.max(1, width * 0.8)} height={alturaCorpo} fill={cor} rx={1} />
    </g>
  );
}

function LinhaNivel({ n, cor, marcado, onAlternar, preco }: { n: Nivel; cor: string; marcado: boolean; onAlternar: () => void; preco: (v: number) => string }) {
  return (
    <tr className={marcado ? "" : "opacity-80"}>
      <td className="py-2 pl-1">
        <input type="checkbox" checked={marcado} onChange={onAlternar} aria-label={`Mostrar ${n.rotulo} no gráfico`} className="h-4 w-4 accent-[var(--destaque)]" />
      </td>
      <td className="py-2">
        <span className="flex items-center gap-2 whitespace-nowrap font-medium text-texto">
          <span className="h-0.5 w-4 rounded" style={{ background: cor }} aria-hidden="true" />
          {n.tipo === "suporte" ? <TrendingDown className="h-3.5 w-3.5 text-menta" aria-hidden="true" /> : <TrendingUp className="h-3.5 w-3.5 text-[#F97316]" aria-hidden="true" />}
          {n.rotulo}
        </span>
      </td>
      <td className="py-2 text-right font-semibold tabular-nums text-texto">{preco(n.preco)}</td>
      <td className={`py-2 text-right tabular-nums ${Math.abs(n.distanciaPct) <= 3 ? "font-semibold text-ambar" : "text-suave"}`}>{pctSinal(n.distanciaPct)}</td>
      <td className="py-2 text-center tabular-nums text-texto">{n.origem === "pivo" ? "—" : n.toques}</td>
      <td className="py-2">
        {n.origem === "pivo" ? (
          <span className="text-xs text-suave">calculado</span>
        ) : (
          <span className="flex items-center gap-1" aria-label={`Força ${n.forca}`}>
            {[1, 2, 3].map((i) => (
              <span key={i} className="h-2 w-3 rounded-sm" style={{ background: i <= (n.forca === "forte" ? 3 : n.forca === "moderada" ? 2 : 1) ? cor : "var(--superficie-2)" }} />
            ))}
            <span className="ml-1 text-xs text-suave">{n.forca}</span>
          </span>
        )}
      </td>
      <td className="whitespace-nowrap py-2 text-xs text-suave">
        {ROTULO_ORIGEM[n.origem]}
        {n.ultimoToque ? ` · ${new Date(`${n.ultimoToque}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : ""}
      </td>
    </tr>
  );
}

function Chip({ ativo, cor, onClick, children }: { ativo: boolean; cor: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${ativo ? "border-transparent bg-superficie-2 text-texto" : "border-linha text-suave"}`}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ativo ? cor : "transparent", border: `2px solid ${cor}` }} aria-hidden="true" />
      {children}
    </button>
  );
}

function Segmentos({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { id: string; rotulo: string; Icone?: typeof CandlestickChart }[];
  valor: string;
  onChange: (v: string) => void;
  rotulo: string;
}) {
  return (
    <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => onChange(o.id)}
          className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${valor === o.id ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
        >
          {o.Icone ? <o.Icone className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
