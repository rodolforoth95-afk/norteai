import "server-only";
import { unstable_cache } from "next/cache";
import type { Indicadores } from "@/lib/dominio/simulador";
import { brapiDisponivel, historico } from "./brapi";
import { registrarErro } from "./util";

// Números de mercado usados pelo simulador, buscados em fontes públicas:
// - Banco Central (SGS): Selic, CDI, IPCA e poupança;
// - CoinGecko: Bitcoin em reais (12 meses);
// - brapi: Ibovespa, ETF de S&P 500 em reais e ETF de FIIs (3 meses, limite do plano gratuito).
// Se uma fonte falhar, fica o valor de referência e a tela avisa.

const REFERENCIA = {
  selic: 13.75,
  cdi: 13.65,
  ipca12m: 4.6,
  poupancaMes: 0.67,
  // Juro real de referência do Tesouro IPCA+ longo (a brapi gratuita não traz esse título).
  jurosReal: 7.0,
};

type PontoSGS = { data: string; valor: string };

async function sgs(serie: number, ultimos = 1): Promise<{ data: string; valor: number }[]> {
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/${ultimos}?formato=json`, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`SGS ${serie}: ${r.status}`);
  const dados = (await r.json()) as PontoSGS[];
  return dados
    .map((p) => {
      const [d, m, a] = p.data.split("/");
      return { data: `${a}-${m}-${d}`, valor: Number(p.valor) };
    })
    .filter((p) => Number.isFinite(p.valor))
    .sort((a, b) => a.data.localeCompare(b.data));
}

async function ultimo(serie: number) {
  const p = (await sgs(serie)).at(-1);
  if (!p) throw new Error(`SGS ${serie}: vazio`);
  return p;
}

async function bitcoin() {
  const r = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=365&interval=daily", {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`CoinGecko: ${r.status}`);
  const { prices } = (await r.json()) as { prices: [number, number][] };
  if (!prices?.length) throw new Error("CoinGecko: vazio");
  const atual = prices.at(-1)![1];
  const ha3m = prices[Math.max(0, prices.length - 92)][1];
  return { preco: atual, var12m: (atual / prices[0][1] - 1) * 100, var3m: (atual / ha3m - 1) * 100 };
}

async function variacao3m(simbolo: string) {
  const pontos = await historico(simbolo, "3mo");
  if (pontos.length < 2) throw new Error(`${simbolo}: sem histórico`);
  return (pontos.at(-1)!.fechamento / pontos[0].fechamento - 1) * 100;
}

// Cada fonte é independente: uma falha não derruba as outras.
async function tentar<T>(nome: string, f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    registrarErro(`indicador ${nome}`, e instanceof Error ? e.message.slice(0, 60) : undefined);
    return null;
  }
}

async function buscar(): Promise<Indicadores> {
  const [selic, cdi, ipca, poupanca, btc] = await Promise.all([
    tentar("selic", () => ultimo(432)),
    tentar("cdi", () => ultimo(4389)),
    tentar("ipca", () => ultimo(13522)),
    tentar("poupança", () => ultimo(195)),
    tentar("bitcoin", bitcoin),
  ]);

  // A brapi gratuita aceita uma requisição por vez (a fila fica em brapi.ts).
  const temBrapi = brapiDisponivel();
  const ibov = temBrapi ? await tentar("ibovespa", () => variacao3m("^BVSP")) : null;
  const sp = temBrapi ? await tentar("s&p em reais", () => variacao3m("IVVB11")) : null;
  const fii = temBrapi ? await tentar("fiis", () => variacao3m("XFIX11")) : null;

  const faltando = [!selic && "Selic", !cdi && "CDI", !ipca && "IPCA", !poupanca && "poupança"].filter(Boolean) as string[];

  return {
    selic: selic?.valor ?? REFERENCIA.selic,
    cdi: cdi?.valor ?? REFERENCIA.cdi,
    ipca12m: ipca?.valor ?? REFERENCIA.ipca12m,
    poupancaMes: poupanca?.valor ?? REFERENCIA.poupancaMes,
    jurosReal: REFERENCIA.jurosReal,
    dataJuros: cdi?.data ?? null,
    dataIpca: ipca?.data ?? null,
    recente: {
      acoes3m: ibov,
      exterior3m: sp,
      fiis3m: fii,
      bitcoin3m: btc?.var3m ?? null,
      bitcoin12m: btc?.var12m ?? null,
      bitcoinPreco: btc?.preco ?? null,
    },
    faltando,
    atualizadoEm: new Date().toISOString(),
  };
}

const TAG_INDICADORES = "indicadores";

// Juros e inflação mudam pouco ao longo do dia: 1 hora de cache basta.
export const indicadores = unstable_cache(buscar, ["indicadores-simulador-v1"], {
  revalidate: 60 * 60,
  tags: [TAG_INDICADORES],
});

export { TAG_INDICADORES };

// Taxas mensais (% no mês) para comparar a carteira: CDI, poupança e inflação.
// Chave: AAAA-MM. Últimos 10 anos.
export type TaxasMensais = { cdi: Record<string, number>; poupanca: Record<string, number>; ipca: Record<string, number> };

async function sgsPeriodo(serie: number, anos: number) {
  const fim = new Date();
  const inicio = new Date(fim.getFullYear() - anos, fim.getMonth(), 1);
  const br = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${br(inicio)}&dataFinal=${br(fim)}`, {
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`SGS ${serie}: ${r.status}`);
  const dados = (await r.json()) as PontoSGS[];
  return Object.fromEntries(
    dados
      .map((p) => {
        const [, m, a] = p.data.split("/");
        return [`${a}-${m}`, Number(p.valor)] as const;
      })
      .filter(([, v]) => Number.isFinite(v)),
  );
}

// Lança erro se alguma série vier vazia, para o cache não guardar uma resposta com falha.
async function buscarTaxasMensais(): Promise<TaxasMensais> {
  const [cdi, poupanca, ipca] = await Promise.all([sgsPeriodo(4391, 10), sgsPeriodo(196, 10), sgsPeriodo(433, 10)]);
  if (!Object.keys(cdi).length || !Object.keys(poupanca).length || !Object.keys(ipca).length) throw new Error("série mensal vazia");
  return { cdi, poupanca, ipca };
}

const taxasEmCache = unstable_cache(buscarTaxasMensais, ["taxas-mensais-v2"], {
  revalidate: 12 * 60 * 60,
  tags: [TAG_INDICADORES],
});

export async function taxasMensais(): Promise<TaxasMensais> {
  try {
    return await taxasEmCache();
  } catch (e) {
    registrarErro("taxas mensais", e instanceof Error ? e.message.slice(0, 60) : undefined);
    return { cdi: {}, poupanca: {}, ipca: {} };
  }
}
