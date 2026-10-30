"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Area,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Cartao, TituloSecao } from "@/components/ui";
import { useCoresTema } from "@/components/useCoresTema";
import { CLASSES, ORDEM_CLASSES } from "@/lib/dominio/catalogo";
import { DIAS_DESATUALIZADO, formatarData, type PontoMensal } from "@/lib/dominio/carteira";
import type { PontoAtencao, StatusFaixa } from "@/lib/dominio/motor";
import type { Classe, Estilo } from "@/lib/dominio/tipos";
import { atualizarPelasCotacoes } from "@/app/acoes-carteira";
import { FormMovimentacao } from "./FormMovimentacao";
import { BotaoExemplo } from "./BotaoExemplo";
import { AvisoErro, AvisoGanhos, Janela, brl, brl0, brlCurto, nomeMesCurto, nomeMesLongo, pct, sinalReais, tom, useAcao } from "./comum";

type Linha = {
  id: string;
  nome: string;
  classe: Classe;
  quantidade: number | null;
  saldo: number;
  aplicado: number;
  rendimento: number;
  rentabilidade: number | null;
  pctCarteira: number;
  ultimaData: string | null;
  diasSemAtualizar: number | null;
};

type Taxas = { cdi: Record<string, number>; poupanca: Record<string, number>; ipca: Record<string, number> };

type Aderencia = {
  estilo: Estilo;
  aderencia: number;
  leitura: string;
  linhas: { classe: Classe; atual: number; min: number; max: number; status: StatusFaixa }[];
};

const PERIODOS = [
  { id: "6m", rotulo: "6M", meses: 6 },
  { id: "12m", rotulo: "12M", meses: 12 },
  { id: "tudo", rotulo: "Tudo", meses: 0 },
] as const;

const INDICADORES = [
  { id: "cdi", rotulo: "CDI", cor: "#60A5FA" },
  { id: "poupanca", rotulo: "Poupança", cor: "#A78BFA" },
  { id: "ipca", rotulo: "Inflação", cor: "#F472B6" },
] as const;
type IdIndicador = (typeof INDICADORES)[number]["id"];

// Mesmo dinheiro, nas mesmas datas, rendendo o indicador (a partir do saldo do início do período).
function comparar(serie: PontoMensal[], inicial: number, taxas: Record<string, number>) {
  let valor = inicial;
  let ultima = 0;
  return serie.map((p) => {
    const t = taxas[p.mes] ?? ultima;
    if (taxas[p.mes] !== undefined) ultima = taxas[p.mes];
    valor = valor * (1 + t / 100) + p.fluxo * (1 + t / 200);
    return Math.max(0, valor);
  });
}

function acumular(meses: string[], taxas: Record<string, number>) {
  let acc = 1;
  return meses.map((m) => {
    if (taxas[m] !== undefined) acc *= 1 + taxas[m] / 100;
    return (acc - 1) * 100;
  });
}

export function PainelCarteira({
  serie,
  linhas,
  taxas,
  aderencia,
  pontos,
  cotacoes,
  teste,
}: {
  serie: PontoMensal[];
  linhas: Linha[];
  taxas: Taxas;
  aderencia: Aderencia | null;
  pontos: PontoAtencao[];
  cotacoes: boolean;
  teste: boolean;
}) {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("12m");
  const [visao, setVisao] = useState<"patrimonio" | "rentabilidade">("patrimonio");
  const [ativos, setAtivos] = useState<Record<IdIndicador, boolean>>({ cdi: true, poupanca: false, ipca: true });
  const [atualizando, setAtualizando] = useState<Linha | null>(null);
  const [ganhos, setGanhos] = useState<string[]>([]);
  const cot = useAcao();
  const [msgCotacao, setMsgCotacao] = useState<string | null>(null);

  const temTaxa = (id: IdIndicador) => Object.keys(taxas[id]).length > 0;
  const atual = serie.at(-1)!;
  const anterior = serie.at(-2);
  const ativas = linhas.filter((l) => l.saldo > 0.005);
  const encerradas = linhas.filter((l) => l.saldo <= 0.005);
  const desatualizados = ativas.filter((l) => (l.diasSemAtualizar ?? 0) > DIAS_DESATUALIZADO);
  const rendimentoTotal = atual.saldo - atual.aplicado;

  // Recorte do período e comparativos.
  const recorte = useMemo(() => {
    const p = PERIODOS.find((x) => x.id === periodo)!;
    const inicio = p.meses ? Math.max(0, serie.length - p.meses) : 0;
    const fatia = serie.slice(inicio);
    const saldoInicial = inicio > 0 ? serie[inicio - 1].saldo : 0;
    const comp = Object.fromEntries(INDICADORES.map((i) => [i.id, comparar(fatia, saldoInicial, taxas[i.id])])) as Record<IdIndicador, number[]>;

    // Rentabilidade acumulada no período (carteira encadeada × indicadores).
    let acc = 1;
    const carteiraAcc = fatia.map((pt) => {
      if (pt.rentabilidade !== null) acc *= 1 + pt.rentabilidade / 100;
      return (acc - 1) * 100;
    });
    const mesesComRent = fatia.filter((pt) => pt.rentabilidade !== null).map((pt) => pt.mes);
    const primeiroRent = fatia.findIndex((pt) => pt.rentabilidade !== null);
    const indAcc = Object.fromEntries(
      INDICADORES.map((i) => {
        const valores = acumular(fatia.map((pt) => pt.mes), Object.fromEntries(Object.entries(taxas[i.id]).filter(([m]) => mesesComRent.includes(m))));
        return [i.id, valores];
      }),
    ) as Record<IdIndicador, number[]>;

    const dados = fatia.map((pt, k) => ({
      mes: pt.mes,
      saldo: pt.saldo,
      aplicado: pt.aplicado,
      cdi: comp.cdi[k],
      poupanca: comp.poupanca[k],
      ipca: comp.ipca[k],
      rCarteira: primeiroRent >= 0 && k >= primeiroRent ? carteiraAcc[k] : null,
      rCdi: primeiroRent >= 0 && k >= primeiroRent ? indAcc.cdi[k] : null,
      rPoupanca: primeiroRent >= 0 && k >= primeiroRent ? indAcc.poupanca[k] : null,
      rIpca: primeiroRent >= 0 && k >= primeiroRent ? indAcc.ipca[k] : null,
      fluxo: pt.fluxo,
      rendimento: pt.rendimento,
      rentabilidade: pt.rentabilidade,
    }));
    // O primeiro mês da carteira é o saldo inicial: fica fora das barras de "dinheiro novo".
    const barras = inicio === 0 ? dados.slice(1) : dados;
    const rendimentoPeriodo = barras.reduce((s, pt) => s + pt.rendimento, 0);
    const aportesPeriodo = barras.reduce((s, pt) => s + pt.fluxo, 0);
    const saldoInicioPeriodo = inicio === 0 ? (fatia[0]?.saldo ?? 0) : saldoInicial;
    const ultimo = dados.at(-1)!;
    return { dados, barras, saldoInicioPeriodo, mesInicio: fatia[0]?.mes ?? "", rendimentoPeriodo, aportesPeriodo, rentPeriodo: ultimo.rCarteira, cdiPeriodo: ultimo.rCdi, ipcaPeriodo: ultimo.rIpca, poupPeriodo: ultimo.rPoupanca, final: ultimo };
  }, [serie, periodo, taxas]);

  const variacaoClasses = ORDEM_CLASSES.map((c) => ({
    classe: c,
    valor: atual.porClasse[c],
    pct: atual.saldo > 0 ? (atual.porClasse[c] / atual.saldo) * 100 : 0,
    pctAntes: anterior && anterior.saldo > 0 ? (anterior.porClasse[c] / anterior.saldo) * 100 : null,
  })).filter((c) => c.valor > 0 || (c.pctAntes ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho e ações */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-texto lg:text-3xl">Carteira</h1>
          <p className="text-sm text-suave">
            {ativas.length} investimentos · atualizado até {nomeMesLongo(atual.mes).toLowerCase()}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Link href="/carteira/adicionar" className="gradiente-marca flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-black">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </Link>
          <Link href="/carteira/importar" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-linha bg-superficie px-4 text-sm font-medium text-texto hover:border-violeta">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Importar / atualizar saldos</span>
            <span className="sm:hidden">Importar</span>
          </Link>
          <button
            type="button"
            disabled={!cotacoes || cot.pendente}
            onClick={() => {
              setMsgCotacao(null);
              cot.executar(atualizarPelasCotacoes, (r) => {
                if (r.ganhos?.length) setGanhos(r.ganhos);
                setMsgCotacao(`${r.resumo?.atualizados ?? 0} de ${r.resumo?.total ?? 0} atualizados pela cotação de hoje.`);
              });
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-linha bg-superficie px-4 text-sm font-medium text-texto hover:border-violeta disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cot.pendente ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">Atualizar cotações</span>
            <span className="sm:hidden">Cotações</span>
          </button>
        </div>
      </header>

      <AvisoGanhos ganhos={ganhos} onFechar={() => setGanhos([])} />
      {cot.erro ? <AvisoErro>{cot.erro}</AvisoErro> : null}
      {msgCotacao ? (
        <p className="rounded-2xl border border-menta/40 bg-menta/10 px-4 py-3 text-sm text-menta" role="status">
          {msgCotacao}
        </p>
      ) : null}

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div data-tema="escuro" className="relative col-span-2 overflow-hidden rounded-3xl p-5 lg:col-span-1" style={{ background: "linear-gradient(135deg, #141414 0%, #2A1606 55%, #6B2E00 100%)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-ciano">Patrimônio</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-texto lg:text-4xl">{brl(atual.saldo)}</p>
          <p className="mt-2 text-xs text-suave">
            Aplicado: <span className="font-semibold text-texto">{brl(atual.aplicado)}</span>
          </p>
        </div>
        <Kpi
          rotulo="Rendimento total"
          valor={sinalReais(rendimentoTotal)}
          classe={tom(rendimentoTotal)}
          detalhe={atual.acumulada !== null ? `${pct(atual.acumulada)} acumulado` : "atualize os saldos para calcular"}
          Icone={rendimentoTotal >= 0 ? TrendingUp : TrendingDown}
        />
        <Kpi
          rotulo={`Rendimento em ${nomeMesCurto(atual.mes)}`}
          valor={sinalReais(atual.rendimento)}
          classe={tom(atual.rendimento)}
          detalhe={atual.rentabilidade !== null ? `${pct(atual.rentabilidade, 2)} no mês` : "sem base no mês anterior"}
          Icone={atual.rendimento >= 0 ? TrendingUp : TrendingDown}
        />
        <Kpi
          rotulo="Dinheiro novo no mês"
          valor={sinalReais(atual.fluxo)}
          classe="text-texto"
          detalhe="aplicações menos resgates"
          Icone={ArrowDownUp}
          largo
        />
      </div>

      {desatualizados.length ? (
        <Link
          href="/carteira/importar"
          className="flex items-start gap-3 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm text-texto hover:border-ambar"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ambar" aria-hidden="true" />
          <span className="flex-1">
            <strong>{desatualizados.length === 1 ? "1 investimento está" : `${desatualizados.length} investimentos estão`} sem atualização há mais de {DIAS_DESATUALIZADO} dias</strong>
            <span className="block text-suave">{desatualizados.slice(0, 4).map((l) => l.nome).join(", ")}. Atualize os saldos para o rendimento ficar certo.</span>
          </span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-suave" aria-hidden="true" />
        </Link>
      ) : null}

      {/* Linha histórica com comparativos */}
      <Cartao className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <TituloSecao
            titulo="Linha histórica"
            subtitulo={visao === "patrimonio" ? "Seu patrimônio × o mesmo dinheiro aplicado em cada indicador" : "Rentabilidade acumulada da carteira × indicadores"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmentos
              opcoes={[
                { id: "patrimonio", rotulo: "R$" },
                { id: "rentabilidade", rotulo: "%" },
              ]}
              valor={visao}
              onChange={(v) => setVisao(v as typeof visao)}
              rotulo="Visão do gráfico"
            />
            <Segmentos opcoes={PERIODOS.map((p) => ({ id: p.id, rotulo: p.rotulo }))} valor={periodo} onChange={(v) => setPeriodo(v as typeof periodo)} rotulo="Período" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {INDICADORES.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={ativos[i.id]}
              onClick={() => setAtivos((a) => ({ ...a, [i.id]: !a[i.id] }))}
              className={`flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                ativos[i.id] ? "border-transparent bg-superficie-2 text-texto" : "border-linha text-suave"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ativos[i.id] ? i.cor : "transparent", border: `2px solid ${i.cor}` }} aria-hidden="true" />
              {i.rotulo}
            </button>
          ))}
        </div>

        {recorte.dados.length >= 2 ? (
          <GraficoHistorico dados={recorte.dados} visao={visao} ativos={{ cdi: ativos.cdi && temTaxa("cdi"), poupanca: ativos.poupanca && temTaxa("poupanca"), ipca: ativos.ipca && temTaxa("ipca") }} />
        ) : (
          <p className="rounded-2xl bg-superficie-2 px-4 py-6 text-center text-sm text-suave">
            A linha histórica aparece a partir do segundo mês de registros. Atualize os saldos no mês que vem (ou registre datas passadas) para ver a evolução.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <Comparativo rotulo="Carteira no período" valor={pct(recorte.rentPeriodo)} classe={tom(recorte.rentPeriodo)} />
          <Comparativo rotulo="CDI" valor={temTaxa("cdi") ? pct(recorte.cdiPeriodo) : "—"} />
          <Comparativo rotulo="Poupança" valor={temTaxa("poupanca") ? pct(recorte.poupPeriodo) : "—"} />
          <Comparativo rotulo="Inflação (IPCA)" valor={temTaxa("ipca") ? pct(recorte.ipcaPeriodo) : "—"} />
          <Comparativo
            rotulo="Carteira × CDI"
            valor={temTaxa("cdi") && recorte.rentPeriodo !== null && recorte.cdiPeriodo ? `${Math.round((recorte.rentPeriodo / recorte.cdiPeriodo) * 100)}% do CDI` : "—"}
            classe={recorte.rentPeriodo !== null && recorte.cdiPeriodo ? (recorte.rentPeriodo >= recorte.cdiPeriodo ? "text-menta" : "text-ambar") : "text-texto"}
          />
        </dl>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-suave">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          A rentabilidade desconta aplicações e resgates (método de Dietz, mês a mês). Os comparativos aplicam as taxas reais do Banco Central ao mesmo dinheiro, nas mesmas datas.
          A inflação do mês corrente ainda não foi divulgada.
        </p>
      </Cartao>

      {/* O que avançou: rendimento × aportes */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="O que fez o patrimônio crescer" subtitulo="Dinheiro novo × rendimento, mês a mês" />
          <div className="grid grid-cols-3 gap-2">
            <Comparativo rotulo={`Saldo em ${nomeMesCurto(recorte.mesInicio)}`} valor={brl0(recorte.saldoInicioPeriodo)} />
            <Comparativo rotulo="+ Dinheiro novo" valor={sinalReais(recorte.aportesPeriodo).replace(",00", "")} />
            <Comparativo rotulo="+ Rendimento" valor={sinalReais(recorte.rendimentoPeriodo).replace(",00", "")} classe={tom(recorte.rendimentoPeriodo)} />
          </div>
          {recorte.barras.length ? <GraficoBarras dados={recorte.barras} /> : <p className="text-sm text-suave">As barras aparecem a partir do segundo mês.</p>}
        </Cartao>
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Mês a mês" subtitulo="Rentabilidade da carteira × CDI" />
          <div className="max-h-[22rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-superficie">
                <tr className="text-left text-[11px] uppercase tracking-wide text-suave">
                  <th className="py-2 font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Patrimônio</th>
                  <th className="py-2 text-right font-medium">Rendimento</th>
                  <th className="py-2 text-right font-medium">%</th>
                  <th className="py-2 text-right font-medium">CDI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {[...serie].reverse().map((p) => (
                  <tr key={p.mes}>
                    <td className="py-2 text-texto">{nomeMesCurto(p.mes)}</td>
                    <td className="py-2 text-right tabular-nums text-texto">{brlCurto(p.saldo)}</td>
                    <td className={`py-2 text-right tabular-nums ${tom(p.rendimento)}`}>{sinalReais(p.rendimento).replace(",00", "")}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${tom(p.rentabilidade)}`}>{pct(p.rentabilidade, 2)}</td>
                    <td className="py-2 text-right tabular-nums text-suave">{taxas.cdi[p.mes] !== undefined ? pct(taxas.cdi[p.mes], 2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      </div>

      {/* Composição e aderência */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao className="flex flex-col gap-4">
          <TituloSecao titulo="Composição" subtitulo={anterior ? `Variação em relação a ${nomeMesCurto(anterior.mes)}` : "Divisão atual por classe"} />
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Rosca fatias={variacaoClasses.map((c) => ({ nome: CLASSES[c.classe].nome, valor: c.valor, cor: CLASSES[c.classe].cor }))} />
            <ul className="flex w-full flex-1 flex-col gap-2">
              {variacaoClasses.map((c) => {
                const delta = c.pctAntes === null ? null : c.pct - c.pctAntes;
                return (
                  <li key={c.classe} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CLASSES[c.classe].cor }} aria-hidden="true" />
                    <span className="flex-1 text-texto">{CLASSES[c.classe].nome}</span>
                    <span className="tabular-nums text-suave">{brlCurto(c.valor)}</span>
                    <span className="w-12 text-right font-semibold tabular-nums text-texto">{c.pct.toFixed(0)}%</span>
                    <span className={`w-14 text-right text-xs tabular-nums ${delta === null || Math.abs(delta) < 0.5 ? "text-suave" : delta > 0 ? "text-menta" : "text-erro"}`}>
                      {delta === null ? "" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} p.p.`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Cartao>

        {aderencia ? (
          <Cartao className="flex flex-col gap-4">
            <TituloSecao titulo="Aderência ao seu estilo" subtitulo={`Referência educacional do estilo ${aderencia.estilo}`} />
            <div className="flex items-center gap-4">
              <Anel valor={aderencia.aderencia} />
              <p className="flex-1 text-sm leading-relaxed text-texto">{aderencia.leitura}</p>
            </div>
            <div className="flex flex-col gap-3">
              {aderencia.linhas
                .filter((l) => l.atual > 0 || l.max > 0)
                .map((l) => (
                  <div key={l.classe}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-texto">{CLASSES[l.classe].nome}</span>
                      <span className={l.status === "Dentro da faixa" ? "text-menta" : "text-ambar"}>
                        {l.atual.toFixed(0)}% · faixa {l.min === l.max ? `${l.max}%` : `${l.min}–${l.max}%`}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2.5 rounded-full bg-superficie-2">
                      <span className="absolute h-2.5 rounded-full bg-texto/15" style={{ left: `${l.min}%`, width: `${Math.max(1, l.max - l.min)}%` }} aria-hidden="true" />
                      <span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${Math.min(100, l.atual)}%`, background: CLASSES[l.classe].cor }} aria-hidden="true" />
                    </div>
                  </div>
                ))}
            </div>
          </Cartao>
        ) : (
          <Cartao>
            <TituloSecao titulo="Aderência ao seu estilo" />
            <p className="mt-2 text-sm text-suave">Faça a entrevista para comparar sua carteira com a referência do seu estilo.</p>
            <Link href="/entrevista" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-ciano">
              Fazer entrevista <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Cartao>
        )}
      </div>

      {/* Investimentos */}
      <TabelaInvestimentos linhas={ativas} onAtualizar={setAtualizando} />

      {encerradas.length ? (
        <details className="rounded-2xl border border-linha bg-superficie px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-suave">{encerradas.length} investimentos zerados (resgatados)</summary>
          <ul className="mt-2 flex flex-col divide-y divide-linha">
            {encerradas.map((l) => (
              <li key={l.id}>
                <Link href={`/carteira/${l.id}`} className="flex min-h-11 items-center justify-between text-sm text-texto">
                  {l.nome}
                  <ChevronRight className="h-4 w-4 text-suave" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {pontos.length ? (
        <div className="flex flex-col gap-2">
          <TituloSecao titulo="Pontos de atenção" />
          {pontos.map((p) => (
            <Link key={p.texto} href={p.link} className="flex items-start gap-3 rounded-2xl border border-ambar/40 bg-ambar/5 px-4 py-3 text-sm text-texto hover:border-ambar">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ambar" aria-hidden="true" />
              <span className="flex-1">{p.texto}</span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-suave" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}

      {teste ? (
        <div className="max-w-sm">
          <BotaoExemplo />
        </div>
      ) : null}

      {atualizando ? (
        <Janela titulo={atualizando.nome} onFechar={() => setAtualizando(null)}>
          <FormMovimentacao
            investimento={{ id: atualizando.id, nome: atualizando.nome, quantidade: atualizando.quantidade, saldo: atualizando.saldo }}
            onFeito={(g) => {
              setAtualizando(null);
              if (g.length) setGanhos(g);
            }}
          />
        </Janela>
      ) : null}
    </div>
  );
}

// --- Peças ---------------------------------------------------------------------------

function Kpi({ rotulo, valor, detalhe, classe, Icone, largo = false }: { rotulo: string; valor: string; detalhe: string; classe: string; Icone: typeof TrendingUp; largo?: boolean }) {
  return (
    <div className={`rounded-3xl border border-linha bg-superficie p-4 lg:col-span-1 lg:p-5 ${largo ? "col-span-2" : ""}`}>
      <p className="flex items-center justify-between text-xs text-suave">
        {rotulo}
        <Icone className={`h-4 w-4 ${classe}`} aria-hidden="true" />
      </p>
      <p className={`mt-1 font-display text-lg font-bold tabular-nums sm:text-2xl ${classe}`}>{valor}</p>
      <p className="mt-1 text-xs text-suave">{detalhe}</p>
    </div>
  );
}

function Comparativo({ rotulo, valor, classe = "text-texto" }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="rounded-2xl bg-superficie-2 px-3 py-2.5">
      <dt className="text-[11px] text-suave">{rotulo}</dt>
      <dd className={`font-display text-base font-bold tabular-nums ${classe}`}>{valor}</dd>
    </div>
  );
}

function Segmentos({ opcoes, valor, onChange, rotulo }: { opcoes: { id: string; rotulo: string }[]; valor: string; onChange: (v: string) => void; rotulo: string }) {
  return (
    <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 min-w-11 rounded-lg px-3 text-xs font-semibold transition ${valor === o.id ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

type DadoGrafico = {
  mes: string;
  saldo: number;
  aplicado: number;
  cdi: number;
  poupanca: number;
  ipca: number;
  rCarteira: number | null;
  rCdi: number | null;
  rPoupanca: number | null;
  rIpca: number | null;
  fluxo: number;
  rendimento: number;
};

function GraficoHistorico({ dados, visao, ativos }: { dados: DadoGrafico[]; visao: "patrimonio" | "rentabilidade"; ativos: Record<IdIndicador, boolean> }) {
  const tema = useCoresTema();
  const reais = visao === "patrimonio";
  const formatar = (v: number) => (reais ? brlCurto(v) : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  const chave = (id: IdIndicador) => (reais ? id : (`r${id.charAt(0).toUpperCase()}${id.slice(1)}` as keyof DadoGrafico));
  const ultimo = dados.at(-1)!;
  return (
    <div
      className="h-72 w-full lg:h-80"
      role="img"
      aria-label={`Linha histórica: patrimônio de ${brl(dados[0].saldo)} em ${nomeMesCurto(dados[0].mes)} para ${brl(ultimo.saldo)} em ${nomeMesCurto(ultimo.mes)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="area-patrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8F00" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF8F00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={nomeMesCurto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tickFormatter={formatar} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={64} domain={reais ? ["auto", "auto"] : ["auto", "auto"]} />
          {!reais ? <ReferenceLine y={0} stroke={tema.suave} strokeOpacity={0.4} /> : null}
          <Tooltip
            labelFormatter={(m) => nomeMesLongo(String(m))}
            formatter={(v, n) => [v === null || v === undefined ? "—" : reais ? brl(Number(v)) : pct(Number(v), 2), String(n)]}
            contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
          />
          {reais ? (
            <>
              <Area type="monotone" dataKey="saldo" name="Patrimônio" stroke={tema.destaque} strokeWidth={3} fill="url(#area-patrimonio)" animationDuration={500} />
              <Line type="stepAfter" dataKey="aplicado" name="Valor aplicado" stroke={tema.suave} strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
            </>
          ) : (
            <Line type="monotone" dataKey="rCarteira" name="Carteira" stroke={tema.destaque} strokeWidth={3} dot={{ r: 2.5, fill: tema.destaque, strokeWidth: 0 }} connectNulls animationDuration={500} />
          )}
          {INDICADORES.filter((i) => ativos[i.id]).map((i) => (
            <Line
              key={i.id}
              type="monotone"
              dataKey={chave(i.id) as string}
              name={reais ? `Se fosse ${i.rotulo === "Inflação" ? "só a inflação" : `no ${i.rotulo}`}` : i.rotulo}
              stroke={i.cor}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              animationDuration={500}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficoBarras({ dados }: { dados: DadoGrafico[] }) {
  const tema = useCoresTema();
  return (
    <div className="h-56 w-full" role="img" aria-label={`Aportes e rendimento por mês: ${dados.map((d) => `${nomeMesCurto(d.mes)} aportes ${brl(d.fluxo)}, rendimento ${brl(d.rendimento)}`).join("; ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={nomeMesCurto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={8} />
          <YAxis tickFormatter={(v) => brlCurto(Number(v))} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
          <ReferenceLine y={0} stroke={tema.suave} strokeOpacity={0.5} />
          <Tooltip
            labelFormatter={(m) => nomeMesLongo(String(m))}
            formatter={(v, n) => [brl(Number(v)), String(n)]}
            contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
            cursor={{ fill: tema.superficie2 }}
          />
          <Bar dataKey="fluxo" name="Dinheiro novo" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="rendimento" name="Rendimento" radius={[4, 4, 0, 0]} maxBarSize={22}>
            {dados.map((d) => (
              <Cell key={d.mes} fill={d.rendimento >= 0 ? "#22C55E" : "#EF4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-1 flex gap-4 text-[11px] text-suave">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#60A5FA]" aria-hidden="true" /> Dinheiro novo (aplicações − resgates)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]" aria-hidden="true" /> Rendimento
        </li>
      </ul>
    </div>
  );
}

function Rosca({ fatias }: { fatias: { nome: string; valor: number; cor: string }[] }) {
  const dados = fatias.filter((f) => f.valor > 0);
  return (
    <div className="h-40 w-40 shrink-0" role="img" aria-label={`Composição: ${dados.map((d) => `${d.nome} ${brl(d.valor)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none" animationDuration={600}>
            {dados.map((d) => (
              <Cell key={d.nome} fill={d.cor} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Anel({ valor }: { valor: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Aderência de ${valor}%`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anel-aderencia" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFB800" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" className="stroke-superficie-2" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#anel-aderencia)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - valor / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-texto">{valor}%</span>
    </div>
  );
}

type Ordem = "saldo" | "rentabilidade" | "rendimento" | "nome" | "atualizacao";

function TabelaInvestimentos({ linhas, onAtualizar }: { linhas: Linha[]; onAtualizar: (l: Linha) => void }) {
  const [ordem, setOrdem] = useState<Ordem>("saldo");
  const [filtro, setFiltro] = useState<Classe | "todas">("todas");
  const classes = ORDEM_CLASSES.filter((c) => linhas.some((l) => l.classe === c));
  const ordenadas = linhas
    .filter((l) => filtro === "todas" || l.classe === filtro)
    .sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome);
      if (ordem === "rentabilidade") return (b.rentabilidade ?? -1e9) - (a.rentabilidade ?? -1e9);
      if (ordem === "rendimento") return b.rendimento - a.rendimento;
      if (ordem === "atualizacao") return (b.diasSemAtualizar ?? 0) - (a.diasSemAtualizar ?? 0);
      return b.saldo - a.saldo;
    });

  return (
    <Cartao className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <TituloSecao titulo="Seus investimentos" subtitulo="Toque em um para ver o extrato, editar ou registrar movimentações" />
        <div className="flex flex-wrap gap-2">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por classe" className="min-h-10 rounded-xl border border-linha bg-superficie-2 px-3 text-sm text-texto">
            <option value="todas">Todas as classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {CLASSES[c].nome}
              </option>
            ))}
          </select>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar por" className="min-h-10 rounded-xl border border-linha bg-superficie-2 px-3 text-sm text-texto">
            <option value="saldo">Maior saldo</option>
            <option value="rentabilidade">Maior rentabilidade</option>
            <option value="rendimento">Maior rendimento</option>
            <option value="atualizacao">Mais desatualizado</option>
            <option value="nome">Nome</option>
          </select>
        </div>
      </div>

      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-suave">
              <th className="py-2 font-medium">Investimento</th>
              <th className="py-2 text-right font-medium">Aplicado</th>
              <th className="py-2 text-right font-medium">Saldo</th>
              <th className="py-2 text-right font-medium">Rendimento</th>
              <th className="py-2 text-right font-medium">Rentab.</th>
              <th className="py-2 text-right font-medium">% carteira</th>
              <th className="py-2 text-right font-medium">Atualizado</th>
              <th className="py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {ordenadas.map((l) => {
              const velho = (l.diasSemAtualizar ?? 0) > DIAS_DESATUALIZADO;
              return (
                <tr key={l.id} className="hover:bg-superficie-2/50">
                  <td className="py-2.5">
                    <Link href={`/carteira/${l.id}`} className="flex items-center gap-2">
                      <span className="h-8 w-1 rounded-full" style={{ background: CLASSES[l.classe].cor }} aria-hidden="true" />
                      <span>
                        <span className="block font-semibold text-texto hover:text-ciano">{l.nome}</span>
                        <span className="block text-xs text-suave">
                          {CLASSES[l.classe].nome}
                          {l.quantidade ? ` · ${l.quantidade.toLocaleString("pt-BR")} un.` : ""}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-suave">{brl(l.aplicado)}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-texto">{brl(l.saldo)}</td>
                  <td className={`py-2.5 text-right tabular-nums ${tom(l.rendimento)}`}>{sinalReais(l.rendimento)}</td>
                  <td className={`py-2.5 text-right font-semibold tabular-nums ${tom(l.rentabilidade)}`}>{pct(l.rentabilidade)}</td>
                  <td className="py-2.5 text-right tabular-nums text-texto">
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden h-1.5 w-12 rounded-full bg-superficie-2 xl:inline-block" aria-hidden="true">
                        <span className="block h-1.5 rounded-full" style={{ width: `${Math.min(100, l.pctCarteira)}%`, background: CLASSES[l.classe].cor }} />
                      </span>
                      {l.pctCarteira.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2.5 text-right text-xs ${velho ? "font-semibold text-ambar" : "text-suave"}`}>{l.ultimaData ? formatarData(l.ultimaData) : "—"}</td>
                  <td className="py-2.5 pl-2 text-right">
                    <button type="button" onClick={() => onAtualizar(l)} className="min-h-9 rounded-lg border border-linha px-2.5 text-xs font-medium text-texto hover:border-ciano">
                      Atualizar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Celular: cartões */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {ordenadas.map((l) => {
          const velho = (l.diasSemAtualizar ?? 0) > DIAS_DESATUALIZADO;
          return (
            <li key={l.id} className="rounded-2xl border border-linha bg-superficie-2/40">
              <Link href={`/carteira/${l.id}`} className="flex items-center gap-3 px-3 pt-3">
                <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: CLASSES[l.classe].cor }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-texto">{l.nome}</span>
                  <span className="block text-xs text-suave">
                    {CLASSES[l.classe].nome} · {l.pctCarteira.toFixed(1)}%
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums text-texto">{brl(l.saldo)}</span>
                  <span className={`block text-xs font-medium tabular-nums ${tom(l.rendimento)}`}>
                    {sinalReais(l.rendimento)} ({pct(l.rentabilidade)})
                  </span>
                </span>
              </Link>
              <div className="flex items-center justify-between px-3 pb-2 pt-1">
                <span className={`text-[11px] ${velho ? "font-semibold text-ambar" : "text-suave"}`}>
                  {l.ultimaData ? `Atualizado em ${formatarData(l.ultimaData)}` : ""}
                </span>
                <button type="button" onClick={() => onAtualizar(l)} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-ciano">
                  Atualizar saldo
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
