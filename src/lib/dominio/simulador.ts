import { FAIXAS } from "./catalogo";
import type { Classe, Estilo, Risco } from "./tipos";

// Simulador de carteiras de exemplo (educacional). Nada aqui é recomendação:
// são misturas didáticas por tipo de investimento, dentro das faixas de cada estilo,
// projetadas com hipóteses explícitas sobre as taxas de hoje e o comportamento histórico.
// Roda igual no navegador (tela dinâmica) e no servidor (comentário da IA).

export type Indicadores = {
  selic: number; // % a.a.
  cdi: number; // % a.a.
  ipca12m: number; // % em 12 meses
  poupancaMes: number; // % ao mês
  jurosReal: number; // % a.a. acima do IPCA (referência do Tesouro IPCA+)
  dataJuros: string | null;
  dataIpca: string | null;
  recente: {
    acoes3m: number | null;
    exterior3m: number | null;
    fiis3m: number | null;
    bitcoin3m: number | null;
    bitcoin12m: number | null;
    bitcoinPreco: number | null;
  };
  faltando: string[];
  atualizadoEm: string;
};

type Familia = "pos" | "pre" | "ipca" | "multi" | "fii" | "acao" | "ext" | "cripto";
type Imposto = "regressivo" | "isento" | "15";

export type Produto = {
  id: string;
  nome: string;
  classe: Classe;
  familia: Familia;
  risco: Risco;
  oQueE: string;
  dentro: string; // o que tem dentro, na prática
  exemplos?: { simbolo: string; nome: string }[]; // composição do índice, nunca indicação
  liquidez: string;
  garantia: string;
  imposto: Imposto;
  rotuloImposto: string;
  aula?: string; // slug de aula relacionada
  // Retorno anual esperado (hipótese) a partir dos indicadores de hoje, em %.
  taxa: (i: Indicadores) => number;
  rotuloTaxa: (i: Indicadores) => string;
  vol: number; // oscilação anual típica (desvio-padrão), em %
  crise: number; // queda aproximada na crise de fev–mar/2020, em %
};

const pct = (v: number, casas = 1) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const PRODUTOS: Record<string, Produto> = {
  tesouro_selic: {
    id: "tesouro_selic",
    nome: "Tesouro Selic",
    classe: "renda_fixa",
    familia: "pos",
    risco: "Baixo",
    oQueE: "Título público que acompanha a Selic. É o investimento de referência para reserva de emergência.",
    dentro: "Um empréstimo ao governo federal, corrigido todo dia útil pela Selic.",
    liquidez: "Diária (D+0 em dias úteis)",
    garantia: "Tesouro Nacional",
    imposto: "regressivo",
    rotuloImposto: "IR de 22,5% a 15% sobre o ganho, conforme o prazo",
    aula: "renda_fixa",
    taxa: (i) => i.selic,
    rotuloTaxa: (i) => `Selic (${pct(i.selic, 2)} a.a.)`,
    vol: 0.3,
    crise: 0,
  },
  cdb: {
    id: "cdb",
    nome: "CDB de banco",
    classe: "renda_fixa",
    familia: "pos",
    risco: "Baixo",
    oQueE: "Empréstimo para um banco, que devolve com juros. A maioria rende um percentual do CDI.",
    dentro: "CDBs que pagam por volta de 100% a 110% do CDI, de bancos diferentes, respeitando o limite do FGC.",
    liquidez: "Diária ou no vencimento, conforme o título",
    garantia: "FGC até R$ 250 mil por CPF e instituição",
    imposto: "regressivo",
    rotuloImposto: "IR de 22,5% a 15% sobre o ganho, conforme o prazo",
    aula: "renda_fixa",
    taxa: (i) => i.cdi * 1.05,
    rotuloTaxa: (i) => `105% do CDI (${pct(i.cdi * 1.05, 2)} a.a.)`,
    vol: 0.3,
    crise: 0,
  },
  lci_lca: {
    id: "lci_lca",
    nome: "LCI e LCA",
    classe: "renda_fixa",
    familia: "pos",
    risco: "Baixo",
    oQueE: "Letras de crédito ligadas a imóveis (LCI) ou ao agronegócio (LCA). Para pessoa física, são isentas de IR.",
    dentro: "Letras que pagam por volta de 90% do CDI, sem IR, com carência mínima antes do resgate.",
    liquidez: "Carência mínima de 9 meses (LCI) ou 6 a 9 meses (LCA)",
    garantia: "FGC até R$ 250 mil por CPF e instituição",
    imposto: "isento",
    rotuloImposto: "Isento de IR para pessoa física",
    aula: "renda_fixa",
    taxa: (i) => i.cdi * 0.9,
    rotuloTaxa: (i) => `90% do CDI, sem IR (${pct(i.cdi * 0.9, 2)} a.a.)`,
    vol: 0.3,
    crise: 0,
  },
  tesouro_prefixado: {
    id: "tesouro_prefixado",
    nome: "Tesouro Prefixado",
    classe: "renda_fixa",
    familia: "pre",
    risco: "Baixo",
    oQueE: "Você sabe a taxa no dia da compra. Levando até o vencimento, recebe exatamente o combinado.",
    dentro: "Título público com taxa fixa. Se vender antes do vencimento, o preço pode estar acima ou abaixo.",
    liquidez: "Diária, a preço de mercado",
    garantia: "Tesouro Nacional",
    imposto: "regressivo",
    rotuloImposto: "IR de 22,5% a 15% sobre o ganho, conforme o prazo",
    aula: "renda_fixa",
    taxa: (i) => i.cdi + 0.2, // prêmio de prazo típico sobre o CDI
    rotuloTaxa: (i) => `Taxa fixa perto de ${pct(i.cdi + 0.2, 1)} a.a.`,
    vol: 3,
    crise: -3,
  },
  tesouro_ipca: {
    id: "tesouro_ipca",
    nome: "Tesouro IPCA+",
    classe: "renda_fixa",
    familia: "ipca",
    risco: "Médio",
    oQueE: "Rende a inflação mais uma taxa fixa. Protege o poder de compra em metas longas, mas oscila no caminho.",
    dentro: "Título público que paga IPCA + juro real. Antes do vencimento, o preço sobe e desce com os juros do mercado.",
    liquidez: "Diária, a preço de mercado",
    garantia: "Tesouro Nacional",
    imposto: "regressivo",
    rotuloImposto: "IR de 22,5% a 15% sobre o ganho, conforme o prazo",
    aula: "inflacao",
    taxa: (i) => ((1 + i.ipca12m / 100) * (1 + i.jurosReal / 100) - 1) * 100,
    rotuloTaxa: (i) => `IPCA + ${pct(i.jurosReal, 1)} (≈ ${pct(((1 + i.ipca12m / 100) * (1 + i.jurosReal / 100) - 1) * 100, 1)} a.a.)`,
    vol: 7,
    crise: -12,
  },
  credito_privado: {
    id: "credito_privado",
    nome: "Debêntures, CRI e CRA",
    classe: "renda_fixa",
    familia: "pos",
    risco: "Médio",
    oQueE: "Empréstimos para empresas. Pagam mais que os títulos de banco porque o risco de calote é maior.",
    dentro: "Títulos de empresas diferentes, pagando algo como CDI + 1,5%. Muitos CRI, CRA e debêntures incentivadas são isentos de IR.",
    liquidez: "Baixa: vender antes do prazo pode ser difícil",
    garantia: "Sem FGC",
    imposto: "regressivo",
    rotuloImposto: "IR regressivo (alguns títulos incentivados são isentos)",
    aula: "renda_fixa",
    taxa: (i) => i.cdi + 1.5,
    rotuloTaxa: (i) => `CDI + 1,5% (≈ ${pct(i.cdi + 1.5, 1)} a.a.)`,
    vol: 2,
    crise: -3,
  },
  multimercado: {
    id: "multimercado",
    nome: "Fundo multimercado",
    classe: "multimercado",
    familia: "multi",
    risco: "Médio",
    oQueE: "Um gestor mistura juros, ações, câmbio e outros mercados. O resultado depende muito dele, e as taxas pesam.",
    dentro: "Cotas de fundos que buscam superar o CDI. Hipótese: CDI + 1% ao ano, já descontadas as taxas.",
    liquidez: "De 1 dia a 60 dias para resgatar, conforme o fundo",
    garantia: "Sem FGC",
    imposto: "regressivo",
    rotuloImposto: "IR regressivo, com antecipação semestral (come-cotas)",
    aula: "multimercado",
    taxa: (i) => i.cdi + 1,
    rotuloTaxa: (i) => `Hipótese: CDI + 1% (≈ ${pct(i.cdi + 1, 1)} a.a.)`,
    vol: 5,
    crise: -6,
  },
  fiis: {
    id: "fiis",
    nome: "Fundos imobiliários",
    classe: "fiis",
    familia: "fii",
    risco: "Médio",
    oQueE: "Cotas de imóveis e títulos imobiliários negociadas na bolsa. Costumam distribuir renda todo mês.",
    dentro: "Uma cesta de FIIs de segmentos diferentes (galpões logísticos, shoppings, escritórios e fundos de papel), como a que o índice IFIX acompanha.",
    liquidez: "Na bolsa, em dias úteis (o preço oscila)",
    garantia: "Sem FGC",
    imposto: "isento",
    rotuloImposto: "Rendimentos mensais isentos; venda com lucro paga 20%",
    aula: "fiis",
    taxa: (i) => i.cdi + 1,
    rotuloTaxa: (i) => `Hipótese: CDI + 1% (≈ ${pct(i.cdi + 1, 1)} a.a.)`,
    vol: 13,
    crise: -32,
  },
  acoes_br: {
    id: "acoes_br",
    nome: "Ações brasileiras",
    classe: "acoes_etfs",
    familia: "acao",
    risco: "Alto",
    oQueE: "Pedaços de empresas listadas na B3. No longo prazo, tendem a render mais que a renda fixa, com muito mais oscilação.",
    dentro: "Uma cesta ampla de empresas, como um ETF que acompanha o Ibovespa (cerca de 85 empresas). Abaixo, algumas das que têm mais peso no índice, só para você conhecer.",
    exemplos: [
      { simbolo: "VALE3", nome: "Vale" },
      { simbolo: "ITUB4", nome: "Itaú Unibanco" },
      { simbolo: "PETR4", nome: "Petrobras" },
      { simbolo: "BBDC4", nome: "Bradesco" },
      { simbolo: "B3SA3", nome: "B3" },
      { simbolo: "BBAS3", nome: "Banco do Brasil" },
      { simbolo: "WEGE3", nome: "WEG" },
      { simbolo: "ABEV3", nome: "Ambev" },
    ],
    liquidez: "Na bolsa, em dias úteis (o preço oscila)",
    garantia: "Sem FGC",
    imposto: "15",
    rotuloImposto: "15% sobre o lucro na venda (ações: vendas até R$ 20 mil/mês isentas)",
    aula: "acoes_etfs",
    taxa: (i) => i.cdi + 3,
    rotuloTaxa: (i) => `Hipótese: CDI + 3% (≈ ${pct(i.cdi + 3, 1)} a.a.)`,
    vol: 24,
    crise: -46,
  },
  exterior: {
    id: "exterior",
    nome: "Ações no exterior",
    classe: "exterior",
    familia: "ext",
    risco: "Alto",
    oQueE: "Empresas de outros países, compradas pela B3 em reais. Diversificam o risco Brasil e expõem ao dólar.",
    dentro: "Um ETF que acompanha o S&P 500, as 500 maiores empresas dos EUA (como Apple, Microsoft, Nvidia e Amazon), negociado em reais.",
    liquidez: "Na bolsa, em dias úteis (o preço oscila)",
    garantia: "Sem FGC",
    imposto: "15",
    rotuloImposto: "15% sobre o lucro na venda",
    aula: "bdrs-etfs",
    taxa: (i) => i.cdi + 2,
    rotuloTaxa: (i) => `Hipótese: CDI + 2% (≈ ${pct(i.cdi + 2, 1)} a.a.)`,
    vol: 18,
    crise: -20,
  },
  bitcoin: {
    id: "bitcoin",
    nome: "Bitcoin",
    classe: "cripto",
    familia: "cripto",
    risco: "Muito alto",
    oQueE: "A primeira criptomoeda, com oferta limitada a 21 milhões. Já caiu mais de 70% algumas vezes.",
    dentro: "Bitcoin comprado direto numa corretora de cripto ou por um ETF de bitcoin na B3.",
    liquidez: "24 horas (corretora de cripto) ou dias úteis (ETF)",
    garantia: "Sem FGC",
    imposto: "15",
    rotuloImposto: "15% sobre o lucro (vendas até R$ 35 mil/mês isentas, fora do ETF)",
    aula: "cripto",
    taxa: (i) => i.cdi + 5,
    rotuloTaxa: (i) => `Hipótese: CDI + 5% (≈ ${pct(i.cdi + 5, 1)} a.a.)`,
    vol: 60,
    crise: -50,
  },
};

// Correlação entre famílias (aproximada, histórica). Renda fixa pós-fixada não oscila.
const CORRELACAO: Partial<Record<`${Familia}-${Familia}`, number>> = {
  "pre-ipca": 0.7,
  "pre-multi": 0.2,
  "pre-fii": 0.3,
  "pre-acao": 0.3,
  "ipca-multi": 0.3,
  "ipca-fii": 0.45,
  "ipca-acao": 0.35,
  "ipca-cripto": 0.1,
  "multi-fii": 0.3,
  "multi-acao": 0.4,
  "multi-ext": 0.3,
  "multi-cripto": 0.2,
  "fii-acao": 0.5,
  "fii-ext": 0.1,
  "fii-cripto": 0.15,
  "acao-ext": 0.3,
  "acao-cripto": 0.3,
  "ext-cripto": 0.3,
};

function correlacao(a: Familia, b: Familia) {
  if (a === b) return 1;
  return CORRELACAO[`${a}-${b}`] ?? CORRELACAO[`${b}-${a}`] ?? 0;
}

export type CarteiraModelo = {
  id: string;
  nome: string;
  ideia: string; // a lógica da mistura, em uma frase
  itens: { produto: string; pct: number }[];
};

// Três misturas por estilo, do menor ao maior risco, sempre dentro das faixas de FAIXAS.
// Os nomes se repetem nos três estilos: o que muda é o quanto cada um pode arriscar.
export const CARTEIRAS: Record<Estilo, CarteiraModelo[]> = {
  Cauteloso: [
    {
      id: "cauteloso-reserva",
      nome: "Mais proteção",
      ideia: "Tudo em renda fixa com liquidez e garantia. Prioriza dormir tranquilo.",
      itens: [
        { produto: "tesouro_selic", pct: 50 },
        { produto: "cdb", pct: 30 },
        { produto: "lci_lca", pct: 20 },
      ],
    },
    {
      id: "cauteloso-diversificada",
      nome: "Equilíbrio",
      ideia: "Mistura títulos pós e prefixados e uma pequena parte em fundo multimercado.",
      itens: [
        { produto: "tesouro_selic", pct: 30 },
        { produto: "cdb", pct: 25 },
        { produto: "lci_lca", pct: 25 },
        { produto: "tesouro_prefixado", pct: 15 },
        { produto: "multimercado", pct: 5 },
      ],
    },
    {
      id: "cauteloso-renda",
      nome: "Mais crescimento",
      ideia: "O máximo de risco do estilo Cauteloso: renda fixa como base, com fundos imobiliários e multimercado.",
      itens: [
        { produto: "tesouro_selic", pct: 30 },
        { produto: "cdb", pct: 20 },
        { produto: "lci_lca", pct: 25 },
        { produto: "tesouro_prefixado", pct: 15 },
        { produto: "multimercado", pct: 5 },
        { produto: "fiis", pct: 5 },
      ],
    },
  ],
  Equilibrado: [
    {
      id: "equilibrado-protecao",
      nome: "Mais proteção",
      ideia: "70% em renda fixa e o restante em bolsa e imóveis, sem cripto nem exterior.",
      itens: [
        { produto: "tesouro_selic", pct: 25 },
        { produto: "cdb", pct: 15 },
        { produto: "lci_lca", pct: 15 },
        { produto: "tesouro_ipca", pct: 15 },
        { produto: "acoes_br", pct: 15 },
        { produto: "fiis", pct: 10 },
        { produto: "multimercado", pct: 5 },
      ],
    },
    {
      id: "equilibrado-equilibrio",
      nome: "Equilíbrio",
      ideia: "60% em renda fixa e o resto espalhado entre bolsa, imóveis, exterior e multimercado.",
      itens: [
        { produto: "tesouro_selic", pct: 20 },
        { produto: "cdb", pct: 10 },
        { produto: "lci_lca", pct: 10 },
        { produto: "tesouro_ipca", pct: 15 },
        { produto: "credito_privado", pct: 5 },
        { produto: "acoes_br", pct: 20 },
        { produto: "fiis", pct: 10 },
        { produto: "exterior", pct: 5 },
        { produto: "multimercado", pct: 5 },
      ],
    },
    {
      id: "equilibrado-crescimento",
      nome: "Mais crescimento",
      ideia: "O máximo de bolsa, exterior e cripto que o estilo Equilibrado comporta. Mais potencial, mais oscilação.",
      itens: [
        { produto: "tesouro_selic", pct: 15 },
        { produto: "lci_lca", pct: 5 },
        { produto: "tesouro_ipca", pct: 20 },
        { produto: "credito_privado", pct: 10 },
        { produto: "acoes_br", pct: 30 },
        { produto: "fiis", pct: 5 },
        { produto: "exterior", pct: 10 },
        { produto: "bitcoin", pct: 3 },
        { produto: "multimercado", pct: 2 },
      ],
    },
  ],
  Ousado: [
    {
      id: "ousado-colchao",
      nome: "Mais proteção",
      ideia: "45% em renda fixa para amortecer as quedas e o restante bem diversificado.",
      itens: [
        { produto: "tesouro_selic", pct: 15 },
        { produto: "lci_lca", pct: 10 },
        { produto: "tesouro_ipca", pct: 15 },
        { produto: "credito_privado", pct: 5 },
        { produto: "acoes_br", pct: 25 },
        { produto: "fiis", pct: 10 },
        { produto: "exterior", pct: 10 },
        { produto: "multimercado", pct: 7 },
        { produto: "bitcoin", pct: 3 },
      ],
    },
    {
      id: "ousado-diversificado",
      nome: "Equilíbrio",
      ideia: "Um terço em renda fixa; bolsa brasileira como motor, com exterior e cripto.",
      itens: [
        { produto: "tesouro_selic", pct: 10 },
        { produto: "tesouro_ipca", pct: 15 },
        { produto: "credito_privado", pct: 10 },
        { produto: "acoes_br", pct: 32 },
        { produto: "fiis", pct: 10 },
        { produto: "exterior", pct: 10 },
        { produto: "multimercado", pct: 8 },
        { produto: "bitcoin", pct: 5 },
      ],
    },
    {
      id: "ousado-potencial",
      nome: "Mais crescimento",
      ideia: "O limite do estilo Ousado: só 25% em renda fixa. Maior potencial e quedas bem mais fortes no caminho.",
      itens: [
        { produto: "tesouro_selic", pct: 10 },
        { produto: "tesouro_ipca", pct: 15 },
        { produto: "acoes_br", pct: 40 },
        { produto: "fiis", pct: 7 },
        { produto: "exterior", pct: 15 },
        { produto: "multimercado", pct: 5 },
        { produto: "bitcoin", pct: 8 },
      ],
    },
  ],
};

export function carteiraPorId(id: string) {
  for (const lista of Object.values(CARTEIRAS)) {
    const c = lista.find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}

// Confere que cada carteira soma 100% e respeita as faixas do estilo (usado nos testes).
export function conferirCarteiras() {
  const problemas: string[] = [];
  for (const [estilo, lista] of Object.entries(CARTEIRAS) as [Estilo, CarteiraModelo[]][]) {
    for (const c of lista) {
      const soma = c.itens.reduce((s, x) => s + x.pct, 0);
      if (soma !== 100) problemas.push(`${c.id}: soma ${soma}%`);
      const porClasse = {} as Record<Classe, number>;
      for (const x of c.itens) {
        const p = PRODUTOS[x.produto];
        if (!p) problemas.push(`${c.id}: produto ${x.produto} não existe`);
        else porClasse[p.classe] = (porClasse[p.classe] ?? 0) + x.pct;
      }
      for (const [classe, faixa] of Object.entries(FAIXAS[estilo]) as [Classe, { min: number; max: number }][]) {
        const v = porClasse[classe] ?? 0;
        if (v < faixa.min || v > faixa.max) problemas.push(`${c.id}: ${classe} ${v}% fora de ${faixa.min}–${faixa.max}%`);
      }
    }
  }
  return problemas;
}

// --- Projeção -------------------------------------------------------------------

export type Entrada = { valor: number; aporte: number; meses: number };

export type PontoProjecao = { mes: number; investido: number; base: number; pessimista: number; otimista: number; poupanca: number };

export type ItemSimulado = {
  produto: Produto;
  pct: number;
  valorInicial: number;
  taxa: number;
  finalBruto: number;
  imposto: number;
};

export type Simulacao = {
  carteira: CarteiraModelo;
  itens: ItemSimulado[];
  taxaEsperada: number; // % a.a. (média ponderada)
  vol: number; // % a.a. (com correlações)
  pontos: PontoProjecao[];
  investido: number;
  finalBase: number;
  finalPessimista: number;
  finalOtimista: number;
  finalPoupanca: number;
  impostoEstimado: number;
  finalLiquido: number;
  finalReal: number; // líquido, em dinheiro de hoje (descontado o IPCA)
  quedaCrise: number; // R$ que a carteira perderia numa queda como a de 2020, no início
  quedaCrisePct: number;
  chancePerdaUmAno: number; // % de chance de terminar 12 meses abaixo do investido (aprox.)
  porClasse: { classe: Classe; pct: number }[];
  recente3m: number | null; // % aproximado que a mistura fez nos últimos 3 meses
};

const Z10 = 1.2816; // percentis 10% e 90% da normal

function mensal(taxaAnual: number) {
  return Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
}

// Função de distribuição da normal (aproximação de Abramowitz-Stegun).
function normalAcumulada(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function aliquotaRegressiva(meses: number) {
  if (meses <= 6) return 0.225;
  if (meses <= 12) return 0.2;
  if (meses <= 24) return 0.175;
  return 0.15;
}

function aliquota(imposto: Imposto, meses: number) {
  if (imposto === "isento") return 0;
  if (imposto === "15") return 0.15;
  return aliquotaRegressiva(meses);
}

// Retorno aproximado da classe nos últimos 3 meses, com dados reais quando houver.
function recenteDoProduto(p: Produto, i: Indicadores): number | null {
  const juros3m = (taxa: number) => (Math.pow(1 + taxa / 100, 0.25) - 1) * 100;
  switch (p.familia) {
    case "acao":
      return i.recente.acoes3m;
    case "ext":
      return i.recente.exterior3m;
    case "fii":
      return i.recente.fiis3m;
    case "cripto":
      return i.recente.bitcoin3m;
    default:
      return juros3m(p.taxa(i)); // renda fixa e multimercado: o que a taxa de hoje paga em 3 meses
  }
}

export function simular(carteira: CarteiraModelo, entrada: Entrada, ind: Indicadores): Simulacao {
  const meses = Math.max(1, Math.round(entrada.meses));
  const valor = Math.max(0, entrada.valor);
  const aporte = Math.max(0, entrada.aporte);

  const pesos = carteira.itens.map((x) => ({ produto: PRODUTOS[x.produto], w: x.pct / 100, pct: x.pct }));
  const taxaEsperada = pesos.reduce((s, x) => s + x.w * x.produto.taxa(ind), 0);

  let variancia = 0;
  for (const a of pesos) {
    for (const b of pesos) {
      variancia += a.w * b.w * (a.produto.vol / 100) * (b.produto.vol / 100) * correlacao(a.produto.familia, b.produto.familia);
    }
  }
  const vol = Math.sqrt(variancia) * 100;
  const anos = meses / 12;

  // Cenários: a taxa média anual do período fica entre os percentis 10% e 90%.
  // Quanto mais longo o prazo, mais as oscilações se compensam (σ/√anos).
  const desvio = (vol / 100 / Math.sqrt(Math.max(anos, 1 / 12))) * Z10;
  const taxaPess = Math.max(-95, (taxaEsperada / 100 - desvio) * 100);
  const taxaOtim = (taxaEsperada / 100 + desvio) * 100;
  const rBase = pesos.map((x) => mensal(x.produto.taxa(ind)));
  const rPess = mensal(taxaPess);
  const rOtim = mensal(taxaOtim);
  const rPoup = ind.poupancaMes / 100;

  const porProduto = pesos.map((x) => x.w * valor);
  let pess = valor;
  let otim = valor;
  let poup = valor;
  let investido = valor;
  const pontos: PontoProjecao[] = [{ mes: 0, investido, base: valor, pessimista: valor, otimista: valor, poupanca: valor }];

  for (let m = 1; m <= meses; m++) {
    for (let k = 0; k < porProduto.length; k++) porProduto[k] = porProduto[k] * (1 + rBase[k]) + aporte * pesos[k].w;
    pess = pess * (1 + rPess) + aporte;
    otim = otim * (1 + rOtim) + aporte;
    poup = poup * (1 + rPoup) + aporte;
    investido += aporte;
    pontos.push({ mes: m, investido, base: porProduto.reduce((s, v) => s + v, 0), pessimista: pess, otimista: otim, poupanca: poup });
  }

  const itens: ItemSimulado[] = pesos.map((x, k) => {
    const aplicado = x.w * (valor + aporte * meses);
    const ganho = Math.max(0, porProduto[k] - aplicado);
    return {
      produto: x.produto,
      pct: x.pct,
      valorInicial: x.w * valor,
      taxa: x.produto.taxa(ind),
      finalBruto: porProduto[k],
      imposto: ganho * aliquota(x.produto.imposto, meses),
    };
  });

  const finalBase = pontos.at(-1)!.base;
  const impostoEstimado = itens.reduce((s, x) => s + x.imposto, 0);
  const finalLiquido = finalBase - impostoEstimado;
  const finalReal = finalLiquido / Math.pow(1 + ind.ipca12m / 100, anos);

  const quedaCrisePct = pesos.reduce((s, x) => s + x.w * x.produto.crise, 0);
  // Chance de um ano terminar no negativo, supondo retornos aproximadamente normais.
  const chancePerdaUmAno = vol < 0.5 ? 0 : normalAcumulada(-taxaEsperada / vol) * 100;

  const classes = new Map<Classe, number>();
  for (const x of pesos) classes.set(x.produto.classe, (classes.get(x.produto.classe) ?? 0) + x.pct);

  const recentes = pesos.map((x) => recenteDoProduto(x.produto, ind));
  const recente3m = recentes.every((r) => r !== null) ? pesos.reduce((s, x, k) => s + x.w * recentes[k]!, 0) : null;

  return {
    carteira,
    itens,
    taxaEsperada,
    vol,
    pontos,
    investido,
    finalBase,
    finalPessimista: pess,
    finalOtimista: otim,
    finalPoupanca: poup,
    impostoEstimado,
    finalLiquido,
    finalReal,
    quedaCrise: (valor * quedaCrisePct) / 100,
    quedaCrisePct,
    chancePerdaUmAno,
    porClasse: [...classes.entries()].map(([classe, pct]) => ({ classe, pct })).sort((a, b) => b.pct - a.pct),
    recente3m,
  };
}

export const PRAZOS = [
  { meses: 6, rotulo: "6 meses" },
  { meses: 12, rotulo: "1 ano" },
  { meses: 24, rotulo: "2 anos" },
  { meses: 60, rotulo: "5 anos" },
  { meses: 120, rotulo: "10 anos" },
] as const;

export const LIMITES = { valorMax: 100_000_000, aporteMax: 10_000_000 };

// --- Textos ---------------------------------------------------------------------

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function rotuloPrazo(meses: number) {
  return PRAZOS.find((p) => p.meses === meses)?.rotulo ?? `${meses} meses`;
}

// Resumo em texto dos números da simulação, enviado à IA (sem dado pessoal).
export function resumoParaIA(s: Simulacao, e: Entrada, ind: Indicadores, estilo: Estilo) {
  return [
    `Estilo de investidor (educacional): ${estilo}`,
    `Carteira de exemplo: ${s.carteira.nome} — ${s.carteira.ideia}`,
    `Mistura: ${s.itens.map((x) => `${x.produto.nome} ${x.pct}%`).join(", ")}`,
    `Valor inicial: ${brl(e.valor)}; aporte mensal: ${brl(e.aporte)}; prazo: ${rotuloPrazo(e.meses)}`,
    `Total investido no período: ${brl(s.investido)}`,
    `Cenário base (bruto): ${brl(s.finalBase)}; faixa de cenários (10% a 90%): ${brl(s.finalPessimista)} a ${brl(s.finalOtimista)}`,
    `Imposto de renda estimado: ${brl(s.impostoEstimado)}; líquido: ${brl(s.finalLiquido)}; líquido em dinheiro de hoje (descontada inflação): ${brl(s.finalReal)}`,
    `Mesmo valor na poupança: ${brl(s.finalPoupanca)}`,
    `Retorno anual esperado (hipótese): ${s.taxaEsperada.toFixed(1)}%; oscilação anual típica: ${s.vol.toFixed(1)}%`,
    `Chance aproximada de um ano terminar no negativo: ${s.chancePerdaUmAno.toFixed(0)}%`,
    `Se uma crise como a de março de 2020 acontecesse logo no início: ${s.quedaCrisePct.toFixed(1)}% (${brl(s.quedaCrise)})`,
    `Indicadores de hoje: Selic ${ind.selic.toFixed(2)}%, CDI ${ind.cdi.toFixed(2)}%, IPCA 12 meses ${ind.ipca12m.toFixed(2)}%` +
      (ind.recente.acoes3m !== null ? `, Ibovespa em 3 meses ${ind.recente.acoes3m.toFixed(1)}%` : "") +
      (ind.recente.bitcoin12m !== null ? `, Bitcoin em 12 meses ${ind.recente.bitcoin12m.toFixed(1)}%` : ""),
  ].join("\n");
}

// Comentário feito pelo próprio app quando a IA não está disponível.
export function comentarioPadrao(s: Simulacao, e: Entrada, ind: Indicadores) {
  const frases = [
    `Nesta simulação, você investiria ${brl(s.investido)} em ${rotuloPrazo(e.meses)} e o cenário base chega a ${brl(s.finalBase)} antes do imposto.`,
  ];
  if (s.vol < 1.5) {
    frases.push(
      `Como quase tudo está em renda fixa, a faixa entre o cenário ruim e o bom é estreita: o resultado depende principalmente da Selic, hoje em ${ind.selic.toFixed(2).replace(".", ",")}% ao ano.`,
    );
  } else {
    frases.push(
      `A faixa de cenários vai de ${brl(s.finalPessimista)} a ${brl(s.finalOtimista)}: é o preço da parte que oscila, e ela fica mais estreita quanto maior o prazo.`,
    );
    frases.push(
      `Se uma crise como a de 2020 viesse logo no início, a carteira cairia cerca de ${Math.abs(s.quedaCrisePct).toFixed(0)}% (${brl(Math.abs(s.quedaCrise))}) antes de se recuperar. Saber disso antes ajuda a não vender no pior momento.`,
    );
  }
  frases.push(
    `Depois do imposto ficariam ${brl(s.finalLiquido)}, contra ${brl(s.finalPoupanca)} na poupança, que é isenta. Descontada a inflação, esse líquido equivale a ${brl(s.finalReal)} em dinheiro de hoje.`,
  );
  frases.push(
    s.vol < 1.5
      ? "Para entender melhor, vale estudar as aulas sobre renda fixa e juros compostos na aba Aprender."
      : "Para entender melhor, vale estudar as aulas sobre diversificação e volatilidade na aba Aprender.",
  );
  return frases.join(" ");
}
