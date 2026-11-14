import "server-only";
import type { Candle } from "@/lib/dominio/tecnica";
import { unstable_cache } from "next/cache";

// Cliente da brapi.dev (cotações da B3). Só roda no servidor; o token fica em BRAPI_TOKEN.
// Plano gratuito (verificado em 30/10/2026): 1 ativo por requisição, 1 requisição por vez,
// histórico diário de até 3 meses, cotações com atraso de até 30 min, 15 mil requisições/mês.
// Dividendos, cripto, câmbio, Selic/IPCA e Tesouro completo exigem plano pago.

const BASE = "https://brapi.dev/api";
const ATIVOS_POR_REQUISICAO = Number(process.env.BRAPI_ATIVOS_POR_REQUISICAO ?? 1);

export class ErroBrapi extends Error {
  constructor(
    public status: number,
    public codigo: string | undefined,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export function brapiDisponivel() {
  return Boolean(process.env.BRAPI_TOKEN);
}

// O plano gratuito aceita uma requisição por vez: enfileira as chamadas.
let fila: Promise<unknown> = Promise.resolve();
function enfileirar<T>(fn: () => Promise<T>): Promise<T> {
  const proxima = fila.then(fn, fn);
  fila = proxima.catch(() => undefined);
  return proxima;
}

// Etiquetas de cache: o botão "Atualizar" invalida a etiqueta e a próxima leitura busca de novo.
export const TAG_MERCADO = "brapi:mercado";
export const tagAtivo = (simbolo: string) => `brapi:ativo:${simbolo.toUpperCase()}`;

async function chamar<T>(caminho: string, cacheSegundos: number, tags: string[] = []): Promise<T> {
  return enfileirar(async () => {
    const r = await fetch(`${BASE}${caminho}`, {
      headers: { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` },
      next: { revalidate: cacheSegundos, tags: ["brapi", ...tags] },
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErroBrapi(r.status, corpo?.code, corpo?.message ?? `Erro ${r.status}`);
    return corpo as T;
  });
}

// --- Tipos (campos que usamos) --------------------------------------------------

export type Cotacao = {
  simbolo: string;
  nome: string;
  preco: number;
  variacao: number; // R$
  variacaoPct: number; // %
  abertura: number | null;
  maxDia: number | null;
  minDia: number | null;
  fechamentoAnterior: number | null;
  volume: number | null;
  valorMercado: number | null;
  min52: number | null;
  max52: number | null;
  pl: number | null;
  lpa: number | null;
  logo: string | null;
  horario: string | null;
};

export type PontoHistorico = { data: string; fechamento: number };

export type ItemLista = {
  simbolo: string;
  nome: string;
  tipo: string; // stock | fund | bdr
  subtipo: string | null; // stock, unit, fii, etf...
  setor: string | null;
  logo: string | null;
  preco: number | null;
  variacaoPct: number | null;
  volume: number | null;
  valorMercado: number | null;
};

type RespostaCotacao = {
  results: {
    symbol: string;
    data: {
      shortName?: string;
      longName?: string;
      regularMarketPrice: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketOpen?: number;
      regularMarketDayHigh?: number;
      regularMarketDayLow?: number;
      regularMarketPreviousClose?: number;
      regularMarketVolume?: number;
      marketCap?: number;
      fiftyTwoWeekLow?: number;
      fiftyTwoWeekHigh?: number;
      priceEarnings?: number;
      earningsPerShare?: number;
      logourl?: string;
      regularMarketTime?: string;
    };
  }[];
};

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// --- Cotações ------------------------------------------------------------------------

export async function cotacoes(simbolos: string[]): Promise<Cotacao[]> {
  const unicos = [...new Set(simbolos.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const resultado: Cotacao[] = [];
  for (let i = 0; i < unicos.length; i += ATIVOS_POR_REQUISICAO) {
    const lote = unicos.slice(i, i + ATIVOS_POR_REQUISICAO);
    try {
      const r = await chamar<RespostaCotacao>(
        `/v2/stocks/quote?symbols=${lote.map(encodeURIComponent).join(",")}`,
        15 * 60,
        lote.map(tagAtivo),
      );
      for (const { symbol, data: d } of r.results) {
        resultado.push({
          simbolo: symbol,
          nome: d.longName ?? d.shortName ?? symbol,
          preco: d.regularMarketPrice,
          variacao: d.regularMarketChange ?? 0,
          variacaoPct: d.regularMarketChangePercent ?? 0,
          abertura: n(d.regularMarketOpen),
          maxDia: n(d.regularMarketDayHigh),
          minDia: n(d.regularMarketDayLow),
          fechamentoAnterior: n(d.regularMarketPreviousClose),
          volume: n(d.regularMarketVolume),
          valorMercado: n(d.marketCap),
          min52: n(d.fiftyTwoWeekLow),
          max52: n(d.fiftyTwoWeekHigh),
          pl: n(d.priceEarnings),
          lpa: n(d.earningsPerShare),
          logo: d.logourl ?? null,
          horario: d.regularMarketTime ?? null,
        });
      }
    } catch (e) {
      // Ativo sem cotação (404) é só ignorado; outros erros sobem.
      if (!(e instanceof ErroBrapi && e.status === 404)) throw e;
    }
  }
  return resultado;
}

export async function cotacao(simbolo: string) {
  return (await cotacoes([simbolo]))[0] ?? null;
}

// --- Histórico (plano gratuito: 1d, 5d, 1mo, 3mo; intervalo diário) -------------------

export const PERIODOS = ["5d", "1mo", "3mo"] as const;
export type Periodo = (typeof PERIODOS)[number];

export async function historico(simbolo: string, periodo: Periodo = "1mo"): Promise<PontoHistorico[]> {
  const r = await chamar<{
    results: { data: { historicalDataPrice: { date: number; close: number | null }[] } }[];
  }>(`/v2/stocks/historical?symbols=${encodeURIComponent(simbolo)}&range=${periodo}&interval=1d&sortOrder=asc`, 60 * 60, [tagAtivo(simbolo)]);
  return (r.results[0]?.data.historicalDataPrice ?? [])
    .filter((p) => typeof p.close === "number")
    .map((p) => ({ data: new Date(p.date * 1000).toISOString().slice(0, 10), fechamento: p.close! }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// --- Perfil da empresa (setor, site, descrição) ---------------------------------------

// Candles diários (abertura, máxima, mínima, fechamento e volume) para a análise técnica
// e os comparativos. O plano gratuito libera até 3 meses; com plano pago, defina
// BRAPI_PERIODO_ANALISE (ex.: 6mo, 1y) para ampliar.

const PERIODOS_ANALISE = ["3mo", "6mo", "1y", "2y", "5y"];
export const PERIODO_ANALISE = PERIODOS_ANALISE.includes(process.env.BRAPI_PERIODO_ANALISE ?? "") ? process.env.BRAPI_PERIODO_ANALISE! : "3mo";

export async function candles(simbolo: string): Promise<Candle[]> {
  const r = await chamar<{
    results: {
      data: { historicalDataPrice: { date: number; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }[] };
    }[];
  }>(`/v2/stocks/historical?symbols=${encodeURIComponent(simbolo)}&range=${PERIODO_ANALISE}&interval=1d&sortOrder=asc`, 60 * 60, [tagAtivo(simbolo)]);
  return (r.results[0]?.data.historicalDataPrice ?? [])
    .filter((p) => [p.open, p.high, p.low, p.close].every((v) => typeof v === "number" && v > 0))
    .map((p) => ({
      data: new Date(p.date * 1000).toISOString().slice(0, 10),
      abertura: p.open!,
      maxima: p.high!,
      minima: p.low!,
      fechamento: p.close!,
      volume: p.volume ?? 0,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export type PerfilEmpresa = { setor: string | null; industria: string | null; site: string | null; descricao: string | null; cidade: string | null };

export async function perfilEmpresa(simbolo: string): Promise<PerfilEmpresa | null> {
  try {
    const r = await chamar<{ results: { summaryProfile?: Record<string, string | null> }[] }>(
      `/quote/${encodeURIComponent(simbolo)}?modules=summaryProfile`,
      24 * 60 * 60,
    );
    const p = r.results[0]?.summaryProfile;
    if (!p) return null;
    return {
      setor: p.sector ?? p.sectorDisp ?? null,
      industria: p.industry ?? p.industryDisp ?? null,
      site: p.website ?? null,
      descricao: p.longBusinessSummary ?? null,
      cidade: [p.city, p.state].filter(Boolean).join(" · ") || null,
    };
  } catch {
    return null;
  }
}

// --- Lista de ativos (não gasta cota de ativos por requisição) -------------------------

type RespostaLista = {
  results: {
    symbol: string;
    name: string;
    assetType: string;
    subType: string | null;
    sector: string | null;
    logoUrl: string | null;
    quote: { lastPrice: number | null; changePercent: number | null; volume: number | null; marketCap: number | null } | null;
  }[];
  pagination?: { totalItems?: number };
};

type ParametrosLista = Parameters<typeof listarAtivos>[0];

// Lista e total de ativos daquele tipo na B3 (a brapi informa o total na paginação).
export async function listarAtivosComTotal(params: ParametrosLista) {
  const { itens, total } = await buscarLista(params);
  return { itens, total };
}

export async function listarAtivos(params: {
  busca?: string;
  ordenar?: "volume" | "change" | "marketCap" | "symbol";
  ordem?: "asc" | "desc";
  limite?: number;
  tipo?: "stock" | "fund" | "bdr";
  subtipo?: "stock" | "unit" | "fii" | "etf" | "bdr";
}): Promise<ItemLista[]> {
  return (await buscarLista(params)).itens;
}

async function buscarLista(params: {
  busca?: string;
  ordenar?: "volume" | "change" | "marketCap" | "symbol";
  ordem?: "asc" | "desc";
  limite?: number;
  tipo?: "stock" | "fund" | "bdr";
  subtipo?: "stock" | "unit" | "fii" | "etf" | "bdr";
}): Promise<{ itens: ItemLista[]; total: number }> {
  const q = new URLSearchParams({
    sortBy: params.ordenar ?? "volume",
    sortOrder: params.ordem ?? "desc",
    limit: String(params.limite ?? 50),
  });
  if (params.busca) q.set("search", params.busca);
  if (params.tipo) q.set("type", params.tipo);
  if (params.subtipo) q.set("subType", params.subtipo);
  const r = await chamar<RespostaLista>(`/v2/tickers?${q}`, params.busca ? 60 * 60 : 15 * 60, [TAG_MERCADO]);
  const itens = r.results
    .filter((a) => !/\dF$/.test(a.symbol)) // mercado fracionário duplica o ativo
    .map((a) => ({
      simbolo: a.symbol,
      nome: a.name,
      tipo: a.assetType,
      subtipo: a.subType,
      setor: a.sector,
      logo: a.logoUrl && !a.logoUrl.endsWith("BRAPI.svg") ? a.logoUrl : null,
      preco: a.quote?.lastPrice ?? null,
      variacaoPct: a.quote?.changePercent ?? null,
      volume: a.quote?.volume ?? null,
      valorMercado: a.quote?.marketCap ?? null,
    }));
  return { itens, total: r.pagination?.totalItems ?? itens.length };
}

// --- Painel do mercado -------------------------------------------------------------------

// Altas e baixas do dia entre os ativos mais negociados (evita papéis sem liquidez).
export async function destaquesDoDia() {
  const [acoes, fiis, etfs] = await Promise.all([
    listarAtivos({ tipo: "stock", ordenar: "volume", limite: 120 }),
    listarAtivos({ subtipo: "fii", ordenar: "volume", limite: 40 }),
    listarAtivos({ subtipo: "etf", ordenar: "volume", limite: 20 }),
  ]);
  const comVariacao = acoes.filter((a) => a.variacaoPct !== null && a.preco !== null);
  const porVariacao = [...comVariacao].sort((a, b) => b.variacaoPct! - a.variacaoPct!);
  return {
    altas: porVariacao.slice(0, 8),
    baixas: porVariacao.slice(-8).reverse(),
    maisNegociadas: acoes.slice(0, 8),
    fiis: fiis.slice(0, 8),
    etfs: etfs.slice(0, 8),
  };
}

export type VariacaoSemana = { simbolo: string; nome: string; logo: string | null; preco: number; variacaoPct: number };

// Maiores altas da semana: variação dos últimos 5 pregões das 20 ações mais negociadas.
// Gasta 20 requisições e fica em cache por 6 horas (~2.400 requisições por mês).
export const altasDaSemana = unstable_cache(
  async (): Promise<VariacaoSemana[]> => {
    const base = (await listarAtivos({ tipo: "stock", ordenar: "volume", limite: 25 })).slice(0, 20);
    const resultado: VariacaoSemana[] = [];
    for (const a of base) {
      try {
        const pontos = await historico(a.simbolo, "1mo");
        if (pontos.length < 6) continue;
        const janela = pontos.slice(-6);
        // Salto de mais de 30% num único pregão costuma ser evento corporativo (desdobramento,
        // grupamento, bonificação) que o histórico não ajustou: distorce a comparação, fica de fora.
        const saltoSuspeito = janela.some((p, i) => i > 0 && Math.abs(p.fechamento / janela[i - 1].fechamento - 1) > 0.3);
        if (saltoSuspeito) continue;
        const ultimo = janela[janela.length - 1].fechamento;
        const inicio = janela[0].fechamento;
        resultado.push({ simbolo: a.simbolo, nome: a.nome, logo: a.logo, preco: ultimo, variacaoPct: ((ultimo - inicio) / inicio) * 100 });
      } catch {
        // Um ativo com falha não derruba o ranking.
      }
    }
    return resultado.sort((x, y) => y.variacaoPct - x.variacaoPct);
  },
  ["brapi-altas-semana-v2"],
  { revalidate: 6 * 60 * 60 },
);

// --- Tesouro Direto e futuros (amostras liberadas no plano gratuito) ----------------------

export const TITULOS_TESOURO = ["tesouro-selic-01032031"];

export type TituloTesouro = {
  simbolo: string;
  nome: string;
  vencimento: string;
  taxaCompra: number | null;
  precoCompra: number | null;
  unidadeTaxa: string;
  descricaoTaxa: string | null;
  dataBase: string | null;
};

export async function tesouro(): Promise<TituloTesouro[]> {
  const titulos: TituloTesouro[] = [];
  for (const s of TITULOS_TESOURO) {
    try {
      const r = await chamar<{
        results: {
          symbol: string;
          bondType: string;
          maturityDate: string;
          buyRate: number | null;
          buyPrice: number | null;
          baseDate: string;
          rateInfo?: { rateType: string; rateUnit: string; description?: string };
        }[];
      }>(`/v2/treasury/indicators?symbols=${s}`, 6 * 60 * 60, [TAG_MERCADO]);
      for (const t of r.results) {
        titulos.push({
          simbolo: t.symbol,
          nome: `${t.bondType} ${t.maturityDate.slice(0, 4)}`,
          vencimento: t.maturityDate,
          taxaCompra: t.buyRate,
          precoCompra: t.buyPrice,
          unidadeTaxa: t.rateInfo?.rateType === "spreadOverSelic" ? "Selic +" : (t.rateInfo?.rateUnit ?? "% a.a."),
          descricaoTaxa: t.rateInfo?.description ?? null,
          dataBase: t.baseDate,
        });
      }
    } catch {
      // Título fora do plano: ignorado.
    }
  }
  return titulos;
}

export type ContratoFuturo = {
  simbolo: string;
  descricao: string;
  vencimento: string;
  fechamento: number | null;
  ajuste: number | null;
  variacaoPct: number | null;
  data: string | null;
};

export async function futuros(ativo: "WIN" | "WDO"): Promise<ContratoFuturo | null> {
  try {
    const r = await chamar<{
      contracts: {
        symbol: string;
        assetDescription: string;
        expirationDate: string;
        close: number | null;
        settlement: number | null;
        oscillationPct: number | null;
        date: number | null;
      }[];
    }>(`/v2/futures/term-structure?asset=${ativo}`, 6 * 60 * 60, [TAG_MERCADO]);
    // Contrato com vencimento mais próximo ainda em aberto.
    const hoje = new Date().toISOString().slice(0, 10);
    const c = [...r.contracts].filter((x) => x.expirationDate >= hoje).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))[0];
    if (!c) return null;
    return {
      simbolo: c.symbol,
      descricao: c.assetDescription,
      vencimento: c.expirationDate,
      fechamento: c.close,
      ajuste: c.settlement,
      variacaoPct: c.oscillationPct,
      data: c.date ? new Date(c.date * 1000).toISOString().slice(0, 10) : null,
    };
  } catch {
    return null;
  }
}

// --- Proventos e indicadores --------------------------------------------------------------
// No plano gratuito a brapi só libera dividendos e indicadores para os ativos de teste
// (PETR4, VALE3, ITUB4, MGLU3); para os demais responde FEATURE_NOT_AVAILABLE ou
// MODULE_NOT_AVAILABLE. Nesses casos devolvemos "indisponivel" em vez de erro.

export type Provento = { data: string; dataCom: string | null; valor: number; tipo: string };
export type Proventos = { disponivel: true; pagamentos: Provento[] } | { disponivel: false; motivo: "plano" | "erro" };

const ehBloqueioDePlano = (e: unknown) => e instanceof ErroBrapi && (e.status === 402 || e.status === 403 || /NOT_AVAILABLE|FEATURE|MODULE|PLAN/i.test(e.codigo ?? ""));

export async function proventos(simbolo: string): Promise<Proventos> {
  try {
    const r = await chamar<{ results: { dividendsData?: { cashDividends?: { paymentDate: string | null; lastDatePrior: string | null; rate: number; label: string }[] } }[] }>(
      `/quote/${encodeURIComponent(simbolo)}?dividends=true`,
      12 * 60 * 60,
      [tagAtivo(simbolo)],
    );
    const lista = r.results[0]?.dividendsData?.cashDividends ?? [];
    return {
      disponivel: true,
      pagamentos: lista
        .filter((d) => d.paymentDate && d.rate > 0)
        .map((d) => ({ data: d.paymentDate!.slice(0, 10), dataCom: d.lastDatePrior?.slice(0, 10) ?? null, valor: d.rate, tipo: d.label === "JCP" ? "JCP" : d.label === "RENDIMENTO" ? "Rendimento" : "Dividendo" }))
        .sort((a, b) => b.data.localeCompare(a.data)),
    };
  } catch (e) {
    return { disponivel: false, motivo: ehBloqueioDePlano(e) ? "plano" : "erro" };
  }
}

export type Indicadores = {
  disponivel: boolean;
  precoLucro: number | null;
  lucroPorAcao: number | null;
  precoValorPatrimonial: number | null;
  valorPatrimonialPorAcao: number | null;
  dividendYield: number | null; // %
};

export async function indicadoresAtivo(simbolo: string): Promise<Indicadores> {
  const base: Indicadores = { disponivel: false, precoLucro: null, lucroPorAcao: null, precoValorPatrimonial: null, valorPatrimonialPorAcao: null, dividendYield: null };
  try {
    const r = await chamar<{ results: { priceEarnings?: number | null; earningsPerShare?: number | null; defaultKeyStatistics?: { priceToBook?: number | null; bookValue?: number | null; dividendYield?: number | null } }[] }>(
      `/quote/${encodeURIComponent(simbolo)}?modules=defaultKeyStatistics`,
      12 * 60 * 60,
      [tagAtivo(simbolo)],
    );
    const x = r.results[0];
    const k = x?.defaultKeyStatistics;
    return {
      disponivel: true,
      precoLucro: x?.priceEarnings ?? null,
      lucroPorAcao: x?.earningsPerShare ?? null,
      precoValorPatrimonial: k?.priceToBook ?? null,
      valorPatrimonialPorAcao: k?.bookValue ?? null,
      dividendYield: k?.dividendYield != null ? k.dividendYield * (k.dividendYield < 1 ? 100 : 1) : null,
    };
  } catch (e) {
    if (!ehBloqueioDePlano(e)) return base;
    // Sem o módulo, a cotação simples ainda traz P/L e LPA.
    try {
      const r = await chamar<{ results: { priceEarnings?: number | null; earningsPerShare?: number | null }[] }>(`/quote/${encodeURIComponent(simbolo)}`, 30 * 60, [tagAtivo(simbolo)]);
      return { ...base, precoLucro: r.results[0]?.priceEarnings ?? null, lucroPorAcao: r.results[0]?.earningsPerShare ?? null };
    } catch {
      return base;
    }
  }
}
