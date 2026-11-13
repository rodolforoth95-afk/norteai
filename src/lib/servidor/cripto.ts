import "server-only";
import type { Candle } from "@/lib/dominio/tecnica";
import { registrarErro } from "./util";

// Criptomoedas pela CoinGecko (gratuita, sem chave), em reais.
// A brapi só cobre ativos da B3; cripto lá exige plano pago.

const BASE = "https://api.coingecko.com/api/v3";
export const TAG_CRIPTO = "cripto";

export type Cripto = {
  id: string; // ex.: bitcoin
  simbolo: string; // ex.: BTC
  nome: string;
  logo: string | null;
  preco: number;
  variacao24h: number | null;
  variacao7d: number | null;
  variacao30d: number | null;
  maxima24h: number | null;
  minima24h: number | null;
  valorMercado: number | null;
  volume24h: number | null;
  posicao: number | null; // ranking por valor de mercado
  maximaHistorica: number | null;
  dataMaximaHistorica: string | null;
  quedaDaMaxima: number | null; // %
  emCirculacao: number | null;
  ofertaMaxima: number | null;
  atualizado: string | null;
};

type RespostaMercado = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  high_24h: number | null;
  low_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
  market_cap_rank: number | null;
  ath: number | null;
  ath_date: string | null;
  ath_change_percentage: number | null;
  circulating_supply: number | null;
  max_supply: number | null;
  last_updated: string | null;
};

async function chamar<T>(caminho: string, cacheSegundos: number): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, {
    headers: { accept: "application/json" },
    next: { revalidate: cacheSegundos, tags: [TAG_CRIPTO] },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  return (await r.json()) as T;
}

function mapear(m: RespostaMercado): Cripto | null {
  if (typeof m.current_price !== "number") return null;
  return {
    id: m.id,
    simbolo: m.symbol.toUpperCase(),
    nome: m.name,
    logo: m.image,
    preco: m.current_price,
    variacao24h: m.price_change_percentage_24h_in_currency ?? null,
    variacao7d: m.price_change_percentage_7d_in_currency ?? null,
    variacao30d: m.price_change_percentage_30d_in_currency ?? null,
    maxima24h: m.high_24h,
    minima24h: m.low_24h,
    valorMercado: m.market_cap,
    volume24h: m.total_volume,
    posicao: m.market_cap_rank,
    maximaHistorica: m.ath,
    dataMaximaHistorica: m.ath_date,
    quedaDaMaxima: m.ath_change_percentage,
    emCirculacao: m.circulating_supply,
    ofertaMaxima: m.max_supply,
    atualizado: m.last_updated,
  };
}

const PARAMS = "vs_currency=brl&price_change_percentage=24h,7d,30d";

// As maiores por valor de mercado (5 min de cache).
export async function listarCriptos(limite = 30): Promise<Cripto[]> {
  try {
    const r = await chamar<RespostaMercado[]>(`/coins/markets?${PARAMS}&order=market_cap_desc&per_page=${limite}&page=1`, 5 * 60);
    return r.map(mapear).filter((c): c is Cripto => c !== null);
  } catch (e) {
    registrarErro("lista de criptos", e instanceof Error ? e.message : undefined);
    return [];
  }
}

export async function cripto(id: string): Promise<Cripto | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(id)) return null;
  try {
    const r = await chamar<RespostaMercado[]>(`/coins/markets?${PARAMS}&ids=${encodeURIComponent(id)}`, 5 * 60);
    return r.length ? mapear(r[0]) : null;
  } catch (e) {
    registrarErro("cripto", e instanceof Error ? e.message : undefined);
    return null;
  }
}

// Candles diários dos últimos 90 dias, montados a partir dos preços hora a hora
// (a CoinGecko entrega intervalo de 1 hora para períodos de até 90 dias). 1 h de cache.
export async function candlesCripto(id: string): Promise<Candle[]> {
  if (!/^[a-z0-9-]{2,60}$/.test(id)) return [];
  try {
    const r = await chamar<{ prices: [number, number][]; total_volumes: [number, number][] }>(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=brl&days=90`, 60 * 60);
    const dia = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(t));
    const volumes = new Map<string, number>();
    for (const [t, v] of r.total_volumes ?? []) volumes.set(dia(t), v);
    const porDia = new Map<string, number[]>();
    for (const [t, p] of r.prices ?? []) {
      if (typeof p !== "number" || p <= 0) continue;
      const d = dia(t);
      porDia.set(d, [...(porDia.get(d) ?? []), p]);
    }
    return [...porDia.entries()]
      .filter(([, precos]) => precos.length >= 2)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, precos]) => ({
        data,
        abertura: precos[0],
        maxima: Math.max(...precos),
        minima: Math.min(...precos),
        fechamento: precos[precos.length - 1],
        volume: volumes.get(data) ?? 0,
      }));
  } catch (e) {
    registrarErro("histórico de cripto", e instanceof Error ? e.message : undefined);
    return [];
  }
}
