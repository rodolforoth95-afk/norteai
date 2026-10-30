"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Coins,
  FlaskConical,
  Info,
  Landmark,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wand2,
} from "lucide-react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Cartao, SeloRisco, TituloSecao } from "@/components/ui";
import { classesBotao } from "@/components/Botao";
import { useCoresTema } from "@/components/useCoresTema";
import { CLASSES, INFO_ESTILO } from "@/lib/dominio/catalogo";
import { LIMITES, PRAZOS, simular, type CarteiraModelo, type Indicadores, type Simulacao } from "@/lib/dominio/simulador";
import type { Estilo } from "@/lib/dominio/tipos";
import { analisarSimulacao } from "@/app/acoes";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCurto = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : Math.abs(v) >= 1000
      ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
      : brl(v);
const pct = (v: number, casas = 1) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const variacao = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${pct(Math.abs(v))}`);

// Cor de cada investimento na tela (tons da classe, para diferenciar dentro da renda fixa).
const COR_PRODUTO: Record<string, string> = {
  tesouro_selic: "#22C55E",
  cdb: "#16A34A",
  lci_lca: "#4ADE80",
  tesouro_prefixado: "#86EFAC",
  tesouro_ipca: "#14B8A6",
  credito_privado: "#0EA5E9",
  multimercado: "#B794F6",
  fiis: "#FFB020",
  acoes_br: "#FF6B00",
  exterior: "#F472B6",
  bitcoin: "#FFE08A",
};

const VALORES_RAPIDOS = [1000, 5000, 10000, 50000];
const APORTES_RAPIDOS = [0, 200, 500, 1000];
const NIVEIS_RISCO = ["Menor risco do seu estilo", "Risco intermediário", "Maior risco do seu estilo"];

export function Simulador({ estilo, carteiras, ind }: { estilo: Estilo; carteiras: CarteiraModelo[]; ind: Indicadores }) {
  const [valor, setValor] = useState(10000);
  const [aporte, setAporte] = useState(500);
  const [meses, setMeses] = useState(60);
  // Os exemplos só aparecem depois de "Simular", com os valores daquele momento.
  const [simulada, setSimulada] = useState<{ valor: number; aporte: number; meses: number } | null>(null);
  const [selecionada, setSelecionada] = useState(carteiras[1]?.id ?? carteiras[0].id);
  const resultados = useRef<HTMLDivElement>(null);

  const simulacoes = useMemo(() => (simulada ? carteiras.map((c) => simular(c, simulada, ind)) : []), [carteiras, simulada, ind]);
  const atual = simulacoes.find((s) => s.carteira.id === selecionada) ?? simulacoes[0];
  const mudou = simulada !== null && (simulada.valor !== valor || simulada.aporte !== aporte || simulada.meses !== meses);
  const podeSimular = valor > 0 || aporte > 0;

  function simularAgora() {
    setSimulada({ valor, aporte, meses });
    requestAnimationFrame(() => resultados.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-ambar/40 bg-ambar/10 px-3 py-1 text-xs font-semibold text-ambar">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Simulação educativa · não é recomendação
        </span>
        <h1 className="font-display text-2xl font-bold text-texto lg:text-3xl">Simulador de carteiras</h1>
        <p className="max-w-3xl text-sm text-suave lg:text-base">
          Informe quanto tem hoje, quanto vai aportar por mês e por quanto tempo. Depois, veja 3 carteiras de exemplo para o estilo{" "}
          <span className="font-semibold text-ciano">{estilo}</span> ({INFO_ESTILO[estilo].risco.toLowerCase()}), da mais protegida à que busca mais
          crescimento, calculadas com os juros e a inflação de hoje.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Cartao className="flex flex-col gap-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ciano">
            <span className="gradiente-marca flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-black">1</span>
            Seus valores
          </p>
          <CampoDinheiro
            id="valor"
            rotulo="Quanto você tem para investir hoje?"
            valor={valor}
            max={LIMITES.valorMax}
            onChange={setValor}
            rapidos={VALORES_RAPIDOS}
          />
          <CampoDinheiro
            id="aporte"
            rotulo="Aporte mensal"
            ajuda="Quanto você vai colocar a mais todo mês."
            valor={aporte}
            max={LIMITES.aporteMax}
            onChange={setAporte}
            rapidos={APORTES_RAPIDOS}
          />
          <fieldset>
            <legend className="text-sm font-semibold text-texto">Por quanto tempo vai aportar?</legend>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {PRAZOS.map((p) => (
                <button
                  key={p.meses}
                  type="button"
                  aria-pressed={meses === p.meses}
                  onClick={() => setMeses(p.meses)}
                  className={`min-h-11 rounded-xl border px-1 text-xs font-semibold transition sm:text-sm ${
                    meses === p.meses ? "border-ciano bg-ciano/15 text-texto" : "border-linha text-suave hover:border-violeta"
                  }`}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="rounded-2xl bg-superficie-2 px-4 py-3 text-sm text-suave">
            Total que você vai investir:{" "}
            <span className="font-display font-bold text-texto">{brl(valor + aporte * meses)}</span>
            <span className="block text-xs">
              {brl(valor)} hoje + {meses} aportes de {brl(aporte)}
            </span>
          </div>
          <button type="button" onClick={simularAgora} disabled={!podeSimular} className={classesBotao("primario", true)}>
            <Wand2 className="h-5 w-5" aria-hidden="true" />
            {simulada ? (mudou ? "Simular com os novos valores" : "Simular de novo") : "Simular"}
          </button>
        </Cartao>

        <PainelIndicadores ind={ind} />
      </div>

      {simulada && atual ? (
        <>
          <div ref={resultados} className="scroll-mt-24">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ciano">
              <span className="gradiente-marca flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-black">2</span>
              Carteiras de exemplo
            </p>
            <TituloSecao
              titulo="Do mais protegido ao mais arrojado"
              subtitulo={`${brl(simulada.valor)} hoje + ${brl(simulada.aporte)} por mês, por ${PRAZOS.find((p) => p.meses === simulada.meses)?.rotulo}. Todas dentro das faixas do estilo ${estilo}.`}
            />
            {mudou ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-ambar" role="status">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Você mudou os valores. Toque em Simular para atualizar os exemplos.
              </p>
            ) : null}
            <div role="radiogroup" aria-label="Carteiras de exemplo" className="mt-3 grid gap-3 md:grid-cols-3">
              {simulacoes.map((s, i) => (
                <CartaoOpcao
                  key={s.carteira.id}
                  s={s}
                  nivel={NIVEIS_RISCO[i] ?? ""}
                  ativa={s.carteira.id === atual.carteira.id}
                  onClick={() => setSelecionada(s.carteira.id)}
                />
              ))}
            </div>
          </div>

          <Comparativo simulacoes={simulacoes} />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-6">
              <Cartao>
                <TituloSecao titulo={`Projeção: ${atual.carteira.nome}`} subtitulo="Cenário base com a faixa entre um período ruim e um bom" />
                <GraficoProjecao s={atual} />
                <Legenda />
              </Cartao>
              <Composicao s={atual} ind={ind} />
            </div>
            <div className="flex flex-col gap-6">
              <Resultado s={atual} meses={simulada.meses} ind={ind} />
              <TesteCrise s={atual} />
              <UltimosMeses s={atual} ind={ind} />
            </div>
          </div>

          <Analise
            key={`${atual.carteira.id}-${simulada.valor}-${simulada.aporte}-${simulada.meses}`}
            carteira={atual.carteira.id}
            entrada={simulada}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-linha px-6 py-10 text-center">
          <FlaskConical className="h-8 w-8 text-suave" aria-hidden="true" />
          <p className="font-display text-lg font-semibold text-texto">Preencha seus valores e toque em Simular</p>
          <p className="max-w-md text-sm text-suave">
            Vamos mostrar 3 carteiras de exemplo para o seu estilo: Mais proteção, Equilíbrio e Mais crescimento, com projeção, imposto, inflação e teste
            de crise.
          </p>
        </div>
      )}

      <ComoLer ind={ind} />

      <AvisoEducacional extra="As carteiras são exemplos didáticos por tipo de investimento, não indicação de compra. Simulações usam hipóteses e não garantem resultado futuro. Rentabilidade passada não garante rentabilidade futura." />
    </section>
  );
}

// --- Entrada --------------------------------------------------------------------

function CampoDinheiro({
  id,
  rotulo,
  ajuda,
  valor,
  max,
  onChange,
  rapidos,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  valor: number;
  max: number;
  onChange: (v: number) => void;
  rapidos: number[];
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-texto">
        {rotulo}
      </label>
      {ajuda ? <p className="text-xs text-suave">{ajuda}</p> : null}
      <div className="mt-2 flex min-h-14 items-center gap-2 rounded-2xl border border-linha bg-superficie-2 px-4 focus-within:border-ciano">
        <span className="text-lg font-semibold text-suave">R$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={valor ? valor.toLocaleString("pt-BR") : ""}
          placeholder="0"
          onChange={(e) => {
            const numero = Number(e.target.value.replace(/\D/g, "").slice(0, 10)) || 0;
            onChange(Math.min(max, numero));
          }}
          className="w-full bg-transparent font-display text-2xl font-bold text-texto outline-none"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rapidos.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`min-h-9 rounded-full border px-3 text-xs font-medium transition ${
              valor === r ? "border-ciano bg-ciano/15 text-texto" : "border-linha text-suave hover:border-violeta"
            }`}
          >
            {r === 0 ? "Nada" : brlCurto(r)}
          </button>
        ))}
      </div>
    </div>
  );
}

function PainelIndicadores({ ind }: { ind: Indicadores }) {
  const itens: { rotulo: string; valor: string; detalhe: string; tom?: "alta" | "baixa" }[] = [
    { rotulo: "Selic", valor: pct(ind.selic, 2), detalhe: "ao ano" },
    { rotulo: "CDI", valor: pct(ind.cdi, 2), detalhe: "ao ano" },
    { rotulo: "Inflação (IPCA)", valor: pct(ind.ipca12m, 2), detalhe: "em 12 meses" },
    { rotulo: "Poupança", valor: pct(ind.poupancaMes, 2), detalhe: "ao mês" },
    ...([
      ["Ibovespa", ind.recente.acoes3m, "em 3 meses"],
      ["S&P 500 em reais", ind.recente.exterior3m, "em 3 meses"],
      ["Fundos imobiliários", ind.recente.fiis3m, "em 3 meses"],
      ["Bitcoin", ind.recente.bitcoin12m, "em 12 meses"],
    ] as const).map(([rotulo, v, detalhe]) => ({
      rotulo,
      valor: variacao(v),
      detalhe,
      tom: v === null ? undefined : v >= 0 ? ("alta" as const) : ("baixa" as const),
    })),
  ];
  const hora = new Date(ind.atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <Cartao className="flex flex-col gap-4">
      <TituloSecao titulo="O mercado hoje" subtitulo="A base dos cálculos, buscada na hora" />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {itens.map((i) => (
          <div key={i.rotulo} className="rounded-2xl border border-linha bg-superficie-2/60 p-3">
            <dt className="truncate text-[11px] text-suave">{i.rotulo}</dt>
            <dd className={`font-display text-lg font-bold ${i.tom === "alta" ? "text-menta" : i.tom === "baixa" ? "text-erro" : "text-texto"}`}>{i.valor}</dd>
            <dd className="text-[11px] text-suave">{i.detalhe}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-relaxed text-suave">
        Fontes: Banco Central (Selic, CDI, IPCA, poupança), brapi.dev (bolsa, com atraso) e CoinGecko (Bitcoin). Atualizado em {hora}.
        {ind.faltando.length ? ` Sem resposta agora de: ${ind.faltando.join(", ")}; usamos um valor de referência.` : ""}
      </p>
    </Cartao>
  );
}

// --- Opções ---------------------------------------------------------------------

function CartaoOpcao({ s, nivel, ativa, onClick }: { s: Simulacao; nivel: string; ativa: boolean; onClick: () => void }) {
  const nivelRisco = Math.min(100, (s.vol / 15) * 100);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-3xl border p-4 text-left transition ${
        ativa ? "border-ciano bg-ciano/10 shadow-[0_0_0_1px_var(--destaque)]" : "border-linha bg-superficie hover:border-violeta"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ciano">{nivel}</p>
          <p className="font-display text-base font-bold text-texto">{s.carteira.nome}</p>
          <p className="mt-0.5 text-xs leading-snug text-suave">{s.carteira.ideia}</p>
        </div>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${ativa ? "border-ciano" : "border-linha"}`}
          aria-hidden="true"
        >
          {ativa ? <span className="h-2.5 w-2.5 rounded-full bg-ciano" /> : null}
        </span>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden="true">
        {s.itens.map((x) => (
          <span key={x.produto.id} style={{ width: `${x.pct}%`, background: COR_PRODUTO[x.produto.id] }} />
        ))}
      </div>
      <p className="text-[11px] text-suave">{s.porClasse.map((c) => `${CLASSES[c.classe].nome} ${c.pct}%`).join(" · ")}</p>

      <div>
        <p className="text-[11px] text-suave">Cenário base no fim do prazo</p>
        <p className="font-display text-2xl font-bold text-texto">{brl(s.finalBase)}</p>
        <p className="text-xs text-suave">
          entre {brlCurto(s.finalPessimista)} e {brlCurto(s.finalOtimista)}
        </p>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-suave">
          <span>Oscilação</span>
          <span>{pct(s.vol)} ao ano</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-superficie-2" aria-hidden="true">
          <div className="gradiente-marca h-1.5 rounded-full" style={{ width: `${Math.max(3, nivelRisco)}%` }} />
        </div>
      </div>
    </button>
  );
}

function Comparativo({ simulacoes }: { simulacoes: Simulacao[] }) {
  const linhas: { rotulo: string; valor: (s: Simulacao) => string; destaque?: boolean }[] = [
    { rotulo: "Renda fixa", valor: (s) => `${s.porClasse.find((c) => c.classe === "renda_fixa")?.pct ?? 0}%` },
    { rotulo: "Bolsa, FIIs, exterior e cripto", valor: (s) => `${100 - (s.porClasse.find((c) => c.classe === "renda_fixa")?.pct ?? 0)}%` },
    { rotulo: "Retorno esperado (hipótese)", valor: (s) => `${pct(s.taxaEsperada)} a.a.` },
    { rotulo: "Cenário base no fim", valor: (s) => brl(s.finalBase), destaque: true },
    { rotulo: "Período ruim", valor: (s) => brl(s.finalPessimista) },
    { rotulo: "Período bom", valor: (s) => brl(s.finalOtimista) },
    { rotulo: "Líquido de IR", valor: (s) => brl(s.finalLiquido) },
    { rotulo: "Queda numa crise como 2020", valor: (s) => (s.quedaCrisePct === 0 ? "≈ 0%" : pct(s.quedaCrisePct)) },
    { rotulo: "Chance de um ano negativo", valor: (s) => pct(s.chancePerdaUmAno, 0) },
  ];
  return (
    <Cartao className="overflow-x-auto">
      <TituloSecao titulo="Comparativo lado a lado" subtitulo="Mais potencial sempre vem com mais oscilação" />
      <table className="mt-3 w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs text-suave">
            <th className="py-2 font-medium">
              <span className="sr-only">Indicador</span>
            </th>
            {simulacoes.map((s) => (
              <th key={s.carteira.id} className="py-2 text-right font-semibold text-texto">
                {s.carteira.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linha">
          {linhas.map((l) => (
            <tr key={l.rotulo}>
              <th scope="row" className="py-2 text-left font-normal text-suave">
                {l.rotulo}
              </th>
              {simulacoes.map((s) => (
                <td key={s.carteira.id} className={`py-2 text-right ${l.destaque ? "font-display font-bold text-ciano" : "text-texto"}`}>
                  {l.valor(s)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Cartao>
  );
}

// --- Gráfico --------------------------------------------------------------------

function rotuloMes(m: number, total: number) {
  if (m === 0) return "Hoje";
  if (total <= 24) return `${m}m`;
  const anos = m / 12;
  return `${anos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${anos === 1 ? "ano" : "anos"}`;
}

function GraficoProjecao({ s }: { s: Simulacao }) {
  const tema = useCoresTema();
  const total = s.pontos.length - 1;
  const passo = Math.max(1, Math.round(total / 60));
  const dados = s.pontos
    .filter((p) => p.mes % passo === 0 || p.mes === total)
    .map((p) => ({ ...p, faixa: [p.pessimista, p.otimista] as [number, number] }));
  const ultimo = s.pontos.at(-1)!;

  return (
    <div
      className="mt-4 h-64 w-full lg:h-72"
      role="img"
      aria-label={`Projeção em ${total} meses: investido ${brl(ultimo.investido)}, cenário base ${brl(ultimo.base)}, faixa de ${brl(ultimo.pessimista)} a ${brl(ultimo.otimista)}, poupança ${brl(ultimo.poupanca)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="faixa-simulacao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8F00" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF8F00" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="mes"
            tickFormatter={(m) => rotuloMes(Number(m), total)}
            tick={{ fill: tema.suave, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis tickFormatter={(v) => brlCurto(Number(v))} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            labelFormatter={(m) => (Number(m) === 0 ? "Hoje" : `Mês ${m}`)}
            formatter={(v, nome) => {
              if (Array.isArray(v)) return [`${brl(Number(v[0]))} a ${brl(Number(v[1]))}`, "Faixa de cenários"];
              return [brl(Number(v)), String(nome)];
            }}
            contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
          />
          <Area type="monotone" dataKey="faixa" name="Faixa de cenários" stroke="none" fill="url(#faixa-simulacao)" animationDuration={500} />
          <Line type="monotone" dataKey="investido" name="Dinheiro investido" stroke={tema.suave} strokeWidth={1.5} strokeDasharray="2 4" dot={false} animationDuration={500} />
          <Line type="monotone" dataKey="poupanca" name="Na poupança" stroke="#60A5FA" strokeWidth={2} strokeDasharray="6 4" dot={false} animationDuration={500} />
          <Line type="monotone" dataKey="base" name="Cenário base" stroke={tema.destaque} strokeWidth={3} dot={false} animationDuration={500} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legenda() {
  const itens = [
    { cor: "var(--destaque)", rotulo: "Cenário base", tipo: "linha" },
    { cor: "#FF8F00", rotulo: "Faixa (período ruim a bom)", tipo: "area" },
    { cor: "#60A5FA", rotulo: "Poupança", tipo: "tracejado" },
    { cor: "var(--suave)", rotulo: "Só o que você guardou", tipo: "tracejado" },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-suave">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-5 rounded-sm"
            style={
              i.tipo === "area"
                ? { background: i.cor, opacity: 0.35 }
                : i.tipo === "linha"
                  ? { height: 3, background: i.cor }
                  : { height: 0, borderTop: `2px dashed ${i.cor}` }
            }
          />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

// --- Detalhes -------------------------------------------------------------------

function Resultado({ s, meses, ind }: { s: Simulacao; meses: number; ind: Indicadores }) {
  const ganho = s.finalLiquido - s.investido;
  const vsPoupanca = s.finalLiquido - s.finalPoupanca;
  const linhas: [string, string, string?][] = [
    ["Você guardaria", brl(s.investido)],
    ["Cenário base (bruto)", brl(s.finalBase)],
    ["Imposto de renda estimado", `− ${brl(s.impostoEstimado)}`],
    ["Líquido no fim", brl(s.finalLiquido), "destaque"],
    ["Em dinheiro de hoje", brl(s.finalReal), `descontando ${pct(ind.ipca12m)} de inflação ao ano`],
  ];
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloSecao titulo="Resultado da simulação" subtitulo={`${PRAZOS.find((p) => p.meses === meses)?.rotulo ?? `${meses} meses`}, cenário base`} />
      <dl className="flex flex-col divide-y divide-linha">
        {linhas.map(([rotulo, v, extra]) => (
          <div key={rotulo} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-sm text-suave">
              {rotulo}
              {extra && extra !== "destaque" ? <span className="block text-[11px]">{extra}</span> : null}
            </dt>
            <dd className={`text-right font-display font-bold ${extra === "destaque" ? "text-xl text-ciano" : "text-texto"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-superficie-2 p-3">
          <p className="text-[11px] text-suave">Ganho líquido</p>
          <p className={`font-display text-lg font-bold ${ganho >= 0 ? "text-menta" : "text-erro"}`}>{brl(ganho)}</p>
        </div>
        <div className="rounded-2xl bg-superficie-2 p-3">
          <p className="text-[11px] text-suave">Contra a poupança</p>
          <p className={`font-display text-lg font-bold ${vsPoupanca >= 0 ? "text-menta" : "text-erro"}`}>
            {vsPoupanca >= 0 ? "+" : "−"}
            {brl(Math.abs(vsPoupanca))}
          </p>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-suave">
        Retorno médio esperado de {pct(s.taxaEsperada)} ao ano (hipótese). IR simplificado: tabela regressiva na renda fixa e nos fundos, 15% na bolsa e no
        Bitcoin, isenção em LCI, LCA e rendimentos de FIIs.
      </p>
    </Cartao>
  );
}

function Composicao({ s, ind }: { s: Simulacao; ind: Indicadores }) {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <Cartao>
      <TituloSecao titulo="O que tem dentro" subtitulo="Toque em cada parte para entender o que é" />
      <ul className="mt-3 flex flex-col gap-2">
        {s.itens.map((x) => {
          const p = x.produto;
          const expandido = aberto === p.id;
          return (
            <li key={p.id} className="rounded-2xl border border-linha bg-superficie-2/40">
              <button
                type="button"
                aria-expanded={expandido}
                onClick={() => setAberto(expandido ? null : p.id)}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
              >
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: COR_PRODUTO[p.id] }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-texto">{p.nome}</span>
                    <span className="text-xs text-suave">{p.rotuloTaxa(ind)}</span>
                  </span>
                  <span className="block text-xs text-suave">{CLASSES[p.classe].nome}</span>
                </span>
                <span className="text-right">
                  <span className="block font-display font-bold text-texto">{x.pct}%</span>
                  <span className="block text-xs text-suave">{brl(x.valorInicial)}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-suave transition ${expandido ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {expandido ? (
                <div className="flex flex-col gap-3 border-t border-linha px-4 py-3 text-sm">
                  <p className="text-texto">{p.oQueE}</p>
                  <p className="text-suave">
                    <span className="font-semibold text-texto">Na simulação: </span>
                    {p.dentro}
                  </p>
                  {p.exemplos ? (
                    <div>
                      <p className="text-xs font-semibold text-texto">Algumas empresas de peso no índice (só para conhecer, não é indicação)</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.exemplos.map((e) => (
                          <Link
                            key={e.simbolo}
                            href={`/mercado/${e.simbolo}`}
                            className="rounded-full border border-linha px-2.5 py-1 text-xs text-suave hover:border-violeta hover:text-texto"
                          >
                            <span className="font-semibold text-texto">{e.simbolo}</span> {e.nome}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <dl className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["Liquidez", p.liquidez],
                      ["Garantia", p.garantia],
                      ["Imposto", p.rotuloImposto],
                    ].map(([r, v]) => (
                      <div key={r} className="rounded-xl bg-superficie p-2.5">
                        <dt className="text-[11px] text-suave">{r}</dt>
                        <dd className="text-xs text-texto">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SeloRisco risco={p.risco} />
                    <span className="text-xs text-suave">
                      Fim do prazo: <span className="font-semibold text-texto">{brl(x.finalBruto)}</span>
                    </span>
                  </div>
                  {p.aula ? (
                    <Link href={`/aprender/${p.aula}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ciano">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Aula relacionada
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}

function TesteCrise({ s }: { s: Simulacao }) {
  const piores = s.itens.filter((x) => x.produto.crise < 0).sort((a, b) => a.produto.crise * a.pct - b.produto.crise * b.pct);
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloSecao titulo="Teste de crise" subtitulo="E se uma queda como a de março de 2020 viesse logo no começo?" />
      <div className="flex items-center gap-3 rounded-2xl border border-erro/30 bg-erro/10 p-3">
        <TrendingDown className="h-8 w-8 shrink-0 text-erro" aria-hidden="true" />
        <div>
          <p className="font-display text-2xl font-bold text-erro">{s.quedaCrisePct === 0 ? "≈ 0%" : pct(s.quedaCrisePct)}</p>
          <p className="text-xs text-suave">{s.quedaCrise === 0 ? "A renda fixa pós-fixada praticamente não oscila." : `${brl(s.quedaCrise)} no pior momento, antes da recuperação`}</p>
        </div>
      </div>
      {piores.length ? (
        <ul className="flex flex-col gap-1.5">
          {piores.slice(0, 4).map((x) => (
            <li key={x.produto.id} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate text-suave">{x.produto.nome}</span>
              <span className="h-1.5 flex-1 rounded-full bg-superficie-2" aria-hidden="true">
                <span className="block h-1.5 rounded-full bg-erro" style={{ width: `${Math.abs(x.produto.crise)}%` }} />
              </span>
              <span className="w-10 text-right font-semibold text-erro">{pct(x.produto.crise, 0)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-start gap-2 text-xs text-suave">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Chance aproximada de um ano terminar no negativo: <span className="font-semibold text-texto">{pct(s.chancePerdaUmAno, 0)}</span>. Em 2020 a bolsa
          recuperou as perdas em cerca de um ano; quem vendeu no pior momento transformou a queda em prejuízo.
        </span>
      </p>
    </Cartao>
  );
}

function UltimosMeses({ s, ind }: { s: Simulacao; ind: Indicadores }) {
  const reais: [string, number | null][] = [
    ["Ibovespa", ind.recente.acoes3m],
    ["S&P 500 em reais", ind.recente.exterior3m],
    ["Fundos imobiliários", ind.recente.fiis3m],
    ["Bitcoin", ind.recente.bitcoin3m],
  ];
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloSecao titulo="Últimos 3 meses de verdade" subtitulo="Como essa mistura teria se saído no mercado real" />
      <p className={`font-display text-3xl font-bold ${s.recente3m === null ? "text-suave" : s.recente3m >= 0 ? "text-menta" : "text-erro"}`}>
        {variacao(s.recente3m)}
      </p>
      <ul className="grid grid-cols-2 gap-2 text-xs">
        {reais.map(([r, v]) => (
          <li key={r} className="flex justify-between rounded-xl bg-superficie-2/60 px-2.5 py-2">
            <span className="text-suave">{r}</span>
            <span className={v === null ? "text-suave" : v >= 0 ? "font-semibold text-menta" : "font-semibold text-erro"}>{variacao(v)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-suave">
        Usa a variação real dos índices de bolsa, FIIs, exterior e Bitcoin, e o que as taxas de hoje pagariam na renda fixa. Três meses é pouco tempo:
        serve para sentir a oscilação, não para julgar uma carteira.
      </p>
    </Cartao>
  );
}

// --- Análise --------------------------------------------------------------------

function Analise({ carteira, entrada }: { carteira: string; entrada: { valor: number; aporte: number; meses: number } }) {
  const [resultado, setResultado] = useState<{ texto: string; fonte: "ia" | "app"; moedas: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function analisar() {
    setErro(null);
    iniciar(async () => {
      const r = await analisarSimulacao({ carteira, ...entrada });
      if ("erro" in r) setErro(r.erro ?? "Não foi possível analisar agora.");
      else setResultado(r);
    });
  }

  return (
    <div className="borda-gradiente rounded-3xl p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-3 lg:w-72 lg:shrink-0 lg:flex-col lg:items-start">
          <span className="gradiente-marca flex h-11 w-11 items-center justify-center rounded-2xl text-black">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-texto">Entenda esta simulação</p>
            <p className="text-sm text-suave">Uma explicação em linguagem simples, com os números do momento.</p>
          </div>
        </div>
        <div className="flex-1" aria-live="polite">
          {resultado ? (
            <div className="flex flex-col gap-3">
              <p className="leading-relaxed text-texto">{resultado.texto}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-suave">
                <span className="rounded-full border border-linha px-2.5 py-1">{resultado.fonte === "ia" ? "Explicado pela IA (Claude)" : "Explicado pelo Norte.ia"}</span>
                {resultado.moedas ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-1 font-semibold text-ambar">
                    <Coins className="h-3.5 w-3.5" aria-hidden="true" />+{resultado.moedas} coins pela primeira simulação
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={analisar} disabled={pendente} className={classesBotao("primario")}>
                <Wand2 className={`h-5 w-5 ${pendente ? "animate-pulse" : ""}`} aria-hidden="true" />
                {pendente ? "Analisando a simulação..." : "Explicar esta simulação"}
              </button>
              {erro ? (
                <p className="flex items-center gap-2 text-sm text-erro">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {erro}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComoLer({ ind }: { ind: Indicadores }) {
  const topicos: { titulo: string; texto: string; icone: typeof Info }[] = [
    {
      titulo: "De onde vêm as taxas",
      icone: Landmark,
      texto: `Na renda fixa, usamos o que os títulos pagam hoje: Selic de ${pct(ind.selic, 2)}, CDI de ${pct(ind.cdi, 2)} e inflação de ${pct(
        ind.ipca12m,
        2,
      )} em 12 meses. Para bolsa, FIIs, exterior e cripto não existe taxa garantida: usamos hipóteses de prêmio sobre o CDI, baseadas no comportamento histórico, e a oscilação típica de cada um.`,
    },
    {
      titulo: "O que é a faixa de cenários",
      icone: Info,
      texto:
        "A faixa vai de um período ruim (só 10% dos casos seriam piores) a um período bom (só 10% seriam melhores). Quanto mais longo o prazo, mais as altas e quedas se compensam e mais estreita a faixa fica em termos anuais.",
    },
    {
      titulo: "Por que diversificar",
      icone: FlaskConical,
      texto:
        "Investimentos diferentes não caem todos juntos. Misturar renda fixa, bolsa, imóveis e exterior reduz a oscilação total sem abrir mão de todo o potencial. É por isso que as carteiras de exemplo espalham o dinheiro.",
    },
    {
      titulo: "O que a simulação não considera",
      icone: AlertTriangle,
      texto:
        "Taxas de corretora, custódia e administração além das citadas, rebalanceamentos, eventos de crédito (calote) e mudanças de regra de imposto. Os resultados reais podem ser bem diferentes.",
    },
  ];
  return (
    <div>
      <TituloSecao titulo="Como ler esta simulação" />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {topicos.map((t) => (
          <details key={t.titulo} className="group rounded-2xl border border-linha bg-superficie p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-texto">
              <t.icone className="h-5 w-5 shrink-0 text-ciano" aria-hidden="true" />
              <span className="flex-1">{t.titulo}</span>
              <ChevronDown className="h-4 w-4 text-suave transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-suave">{t.texto}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
