import type { Classe, Posicao } from "./tipos";

// Carteira com histórico de movimentações (o "extrato" de cada investimento).
// Cada investimento guarda o que entrou (aplicação), o que saiu (resgate) e o saldo
// informado em cada data (atualização). Com isso dá para separar o dinheiro novo do
// rendimento e calcular a evolução mês a mês, como fazem as corretoras.
// Roda igual no navegador e no servidor.

export type TipoMovimentacao = "aplicacao" | "resgate" | "saldo";
export type OrigemMovimentacao = "manual" | "pdf" | "planilha" | "imagem" | "cotacao" | "exemplo" | "migracao";

export type Movimentacao = {
  id: string;
  data: string; // AAAA-MM-DD, nunca depois de hoje
  tipo: TipoMovimentacao;
  valor: number; // aplicação/resgate: quanto entrou/saiu; saldo: o valor total naquela data
  quantidade: number | null; // quantidade total depois do movimento, quando fizer sentido
  origem: OrigemMovimentacao;
  criado_em: string;
};

export type Investimento = {
  id: string;
  nome: string; // código de negociação (PETR4) ou nome do produto (Tesouro Selic 2029)
  classe: Classe;
  tipo: string | null; // tipo do catálogo (cdb, tesouro-selic, acoes…), quando conhecido
  quantidade: number | null;
  criado_em: string;
  movimentacoes: Movimentacao[];
};

export type CarteiraDados = {
  versao: 2;
  investimentos: Investimento[];
  atualizada_em: string;
};

export const ROTULO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  aplicacao: "Aplicação",
  resgate: "Resgate",
  saldo: "Atualização de saldo",
};

export const ROTULO_ORIGEM: Record<OrigemMovimentacao, string> = {
  manual: "digitado",
  pdf: "PDF",
  planilha: "planilha",
  imagem: "imagem",
  cotacao: "cotação da bolsa",
  exemplo: "exemplo",
  migracao: "versão anterior",
};

// Dias sem atualização a partir dos quais o investimento aparece como desatualizado.
export const DIAS_DESATUALIZADO = 35;

export function carteiraVazia(): CarteiraDados {
  return { versao: 2, investimentos: [], atualizada_em: new Date().toISOString() };
}

// --- Datas -----------------------------------------------------------------------

// Data de hoje no fuso de Brasília (AAAA-MM-DD).
export function hojeBR(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

export const DATA_MINIMA = "1990-01-01";

export function dataValida(data: string, hoje = hojeBR()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(`${data}T12:00:00`)) && data >= DATA_MINIMA && data <= hoje;
}

function mesDe(data: string) {
  return data.slice(0, 7);
}

function proximoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

function fimDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}

export function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00`) - Date.parse(`${de}T12:00:00`)) / 86_400_000);
}

export function formatarData(data: string) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

// --- Estado de um investimento ---------------------------------------------------

export function ordenarMovimentacoes(movs: Movimentacao[]) {
  return [...movs].sort((a, b) => a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em));
}

export type EstadoInvestimento = {
  saldo: number;
  aplicado: number; // custo do que ainda está investido
  aplicadoTotal: number; // tudo que já entrou
  resgatadoTotal: number;
  ultimaData: string | null;
};

// Repete o extrato até a data informada (inclusive).
export function estadoEm(inv: Investimento, ate: string): EstadoInvestimento {
  let saldo = 0;
  let aplicado = 0;
  let aplicadoTotal = 0;
  let resgatadoTotal = 0;
  let ultimaData: string | null = null;
  for (const m of ordenarMovimentacoes(inv.movimentacoes)) {
    if (m.data > ate) break;
    ultimaData = m.data;
    if (m.tipo === "aplicacao") {
      saldo += m.valor;
      aplicado += m.valor;
      aplicadoTotal += m.valor;
    } else if (m.tipo === "resgate") {
      const valor = Math.min(m.valor, saldo);
      // O custo sai na mesma proporção do saldo resgatado.
      aplicado = saldo > 0 ? aplicado * (1 - valor / saldo) : 0;
      saldo -= valor;
      resgatadoTotal += valor;
    } else {
      saldo = m.valor;
    }
  }
  return { saldo: Math.max(0, saldo), aplicado: Math.max(0, aplicado), aplicadoTotal, resgatadoTotal, ultimaData };
}

function fluxoNoPeriodo(inv: Investimento, de: string, ate: string) {
  let fluxo = 0;
  for (const m of inv.movimentacoes) {
    if (m.data < de || m.data > ate) continue;
    if (m.tipo === "aplicacao") fluxo += m.valor;
    if (m.tipo === "resgate") fluxo -= m.valor;
  }
  return fluxo;
}

// --- Série mensal ------------------------------------------------------------------

export type PontoMensal = {
  mes: string; // AAAA-MM
  saldo: number;
  aplicado: number;
  fluxo: number; // aplicações − resgates no mês
  rendimento: number; // quanto a carteira ganhou (ou perdeu) no mês, sem contar dinheiro novo
  rentabilidade: number | null; // % do mês (método de Dietz simplificado)
  acumulada: number | null; // % acumulada desde o início (encadeada mês a mês)
  porClasse: Record<Classe, number>;
};

const CLASSES_ORDEM: Classe[] = ["renda_fixa", "acoes_etfs", "fiis", "multimercado", "cripto", "exterior"];

function zerado(): Record<Classe, number> {
  return Object.fromEntries(CLASSES_ORDEM.map((c) => [c, 0])) as Record<Classe, number>;
}

export function primeiraData(c: CarteiraDados): string | null {
  let menor: string | null = null;
  for (const inv of c.investimentos) for (const m of inv.movimentacoes) if (!menor || m.data < menor) menor = m.data;
  return menor;
}

export function serieMensal(c: CarteiraDados, hoje = hojeBR()): PontoMensal[] {
  const inicio = primeiraData(c);
  if (!inicio) return [];
  const pontos: PontoMensal[] = [];
  let saldoAnterior = 0;
  let acumulado = 1;
  let temAcumulado = false;

  for (let mes = mesDe(inicio); mes <= mesDe(hoje); mes = proximoMes(mes)) {
    const ate = mes === mesDe(hoje) ? hoje : fimDoMes(mes);
    const de = `${mes}-01`;
    let saldo = 0;
    let aplicado = 0;
    let fluxo = 0;
    const porClasse = zerado();
    for (const inv of c.investimentos) {
      const e = estadoEm(inv, ate);
      saldo += e.saldo;
      aplicado += e.aplicado;
      porClasse[inv.classe] += e.saldo;
      fluxo += fluxoNoPeriodo(inv, de, ate);
    }
    const rendimento = saldo - saldoAnterior - fluxo;
    const base = saldoAnterior + fluxo / 2;
    const rentabilidade = base > 0.01 && saldoAnterior > 0.01 ? (rendimento / base) * 100 : null;
    if (rentabilidade !== null) {
      acumulado *= 1 + rentabilidade / 100;
      temAcumulado = true;
    }
    pontos.push({
      mes,
      saldo: arred(saldo),
      aplicado: arred(aplicado),
      fluxo: arred(fluxo),
      rendimento: arred(rendimento),
      rentabilidade,
      acumulada: temAcumulado ? (acumulado - 1) * 100 : null,
      porClasse,
    });
    saldoAnterior = saldo;
  }
  return pontos;
}

// "Se o mesmo dinheiro, nas mesmas datas, tivesse ido para X": aplica as taxas mensais
// de um indicador (CDI, poupança, IPCA) às mesmas aplicações e resgates da carteira.
export function serieComparativa(serie: PontoMensal[], taxas: Record<string, number>) {
  let valor = 0;
  let ultimaTaxa = 0;
  return serie.map((p) => {
    const taxa = taxas[p.mes] ?? ultimaTaxa;
    if (taxas[p.mes] !== undefined) ultimaTaxa = taxas[p.mes];
    const r = taxa / 100;
    valor = valor * (1 + r) + p.fluxo * (1 + r / 2);
    return arred(Math.max(0, valor));
  });
}

// Rentabilidade acumulada de um indicador no mesmo período da série (para comparar %).
export function acumuladoDoIndicador(serie: PontoMensal[], taxas: Record<string, number>) {
  let acc = 1;
  let comecou = false;
  return serie.map((p) => {
    if (p.rentabilidade !== null) comecou = true;
    if (comecou && taxas[p.mes] !== undefined) acc *= 1 + taxas[p.mes] / 100;
    return comecou ? (acc - 1) * 100 : null;
  });
}

// --- Resumo e linhas da tabela -------------------------------------------------------

export type LinhaInvestimento = {
  inv: Investimento;
  saldo: number;
  aplicado: number;
  rendimento: number;
  rentabilidade: number | null;
  pctCarteira: number;
  ultimaData: string | null;
  diasSemAtualizar: number | null;
};

export function linhasDaCarteira(c: CarteiraDados, hoje = hojeBR()): LinhaInvestimento[] {
  const estados = c.investimentos.map((inv) => ({ inv, e: estadoEm(inv, hoje) }));
  const total = estados.reduce((s, x) => s + x.e.saldo, 0);
  return estados
    .map(({ inv, e }) => ({
      inv,
      saldo: e.saldo,
      aplicado: e.aplicado,
      rendimento: e.saldo - e.aplicado,
      rentabilidade: e.aplicado > 0.01 ? (e.saldo / e.aplicado - 1) * 100 : null,
      pctCarteira: total > 0 ? (e.saldo / total) * 100 : 0,
      ultimaData: e.ultimaData,
      diasSemAtualizar: e.ultimaData ? diasEntre(e.ultimaData, hoje) : null,
    }))
    .sort((a, b) => b.saldo - a.saldo);
}

export function resumoCarteira(c: CarteiraDados, hoje = hojeBR()) {
  const serie = serieMensal(c, hoje);
  const atual = serie.at(-1);
  const linhas = linhasDaCarteira(c, hoje);
  const ativas = linhas.filter((l) => l.saldo > 0.005);
  return {
    serie,
    linhas,
    patrimonio: atual?.saldo ?? 0,
    aplicado: atual?.aplicado ?? 0,
    rendimento: (atual?.saldo ?? 0) - (atual?.aplicado ?? 0),
    rentabilidadeAcumulada: atual?.acumulada ?? null,
    mes: atual ?? null,
    quantidade: ativas.length,
    desatualizados: ativas.filter((l) => (l.diasSemAtualizar ?? 0) > DIAS_DESATUALIZADO),
    rendimento12m: serie.slice(-12).reduce((s, p) => s + p.rendimento, 0),
  };
}

// Posições atuais no formato antigo (usado pela aderência e pelos pontos de atenção).
export function posicoesAtuais(c: CarteiraDados, hoje = hojeBR()): Posicao[] {
  return linhasDaCarteira(c, hoje)
    .filter((l) => l.saldo > 0.005)
    .map((l) => ({
      id: l.inv.id,
      classe: l.inv.classe,
      codigo_ou_nome: l.inv.nome,
      quantidade: l.inv.quantidade,
      valor_atual: l.saldo,
      data_referencia: l.ultimaData,
    }));
}

// --- Conferência de importação ------------------------------------------------------

export function normalizarNome(t: string) {
  return t
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9+]/g, "");
}

// Procura, entre os investimentos atuais, o que corresponde a uma linha importada.
export function acharCorrespondente(c: CarteiraDados, nome: string): Investimento | null {
  const alvo = normalizarNome(nome);
  if (!alvo) return null;
  const exato = c.investimentos.find((i) => normalizarNome(i.nome) === alvo);
  if (exato) return exato;
  if (alvo.length < 6) return null;
  return c.investimentos.find((i) => {
    const n = normalizarNome(i.nome);
    return n.length >= 6 && (n.includes(alvo) || alvo.includes(n));
  }) ?? null;
}

function arred(v: number) {
  return Math.round(v * 100) / 100;
}

// --- Conversão da versão anterior ----------------------------------------------------

export function novoId() {
  return globalThis.crypto.randomUUID();
}

// A carteira antiga era só uma foto: cada posição vira um investimento com uma
// aplicação do valor que tinha na data de referência.
export function deVersaoAnterior(posicoes: Posicao[], dataPadrao: string): CarteiraDados {
  const agora = new Date().toISOString();
  const hoje = hojeBR();
  return {
    versao: 2,
    atualizada_em: agora,
    investimentos: posicoes
      .filter((p) => p.valor_atual > 0)
      .map((p) => {
        const data = p.data_referencia && dataValida(p.data_referencia, hoje) ? p.data_referencia : dataPadrao;
        return {
          id: novoId(),
          nome: p.codigo_ou_nome,
          classe: p.classe,
          tipo: null,
          quantidade: p.quantidade,
          criado_em: agora,
          movimentacoes: [
            { id: novoId(), data, tipo: "aplicacao" as const, valor: p.valor_atual, quantidade: p.quantidade, origem: "migracao" as const, criado_em: agora },
          ],
        };
      }),
  };
}
