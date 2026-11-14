// Conta simulada: uma carteira de mentira, com dinheiro fictício, para a pessoa acompanhar
// com cotações reais (ações, FIIs, ETFs) e renda fixa que rende pelo CDI. Puro.

export type PosicaoBolsa = { id: string; tipo: "bolsa"; codigo: string; quantidade: number; precoMedio: number; aberta_em: string };
export type PosicaoRendaFixa = { id: string; tipo: "renda_fixa"; nome: string; valorAplicado: number; pctCdi: number; aberta_em: string };
export type Posicao = PosicaoBolsa | PosicaoRendaFixa;
export type Operacao = { id: string; data: string; tipo: "compra" | "venda" | "aplicacao" | "resgate"; descricao: string; valor: number };
export type Fotografia = { data: string; valor: number; cdi: number; ibov: number | null };

export type ContaSimulada = {
  versao: 1;
  criada_em: string; // AAAA-MM-DD
  saldoInicial: number;
  caixa: number;
  posicoes: Posicao[];
  operacoes: Operacao[];
  ibovInicial: number | null;
  historico: Fotografia[];
};

export const SALDOS_INICIAIS = [10_000, 50_000, 100_000];

export function novaConta(saldoInicial: number, hoje: string, ibov: number | null): ContaSimulada {
  return { versao: 1, criada_em: hoje, saldoInicial, caixa: saldoInicial, posicoes: [], operacoes: [], ibovInicial: ibov, historico: [{ data: hoje, valor: saldoInicial, cdi: saldoInicial, ibov: ibov ? saldoInicial : null }] };
}

const diasEntre = (a: string, b: string) => Math.max(0, Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86_400_000));

// Rende pelo CDI anual informado, contando dias úteis aproximados (252 por ano).
export function fatorCdi(cdiAnual: number, desde: string, ate: string, pct = 100) {
  const diasUteis = (diasEntre(desde, ate) * 252) / 365;
  const diario = Math.pow(1 + cdiAnual / 100, 1 / 252) - 1;
  return Math.pow(1 + diario * (pct / 100), diasUteis);
}

export type PosicaoAvaliada = Posicao & { valorAtual: number; custo: number; resultado: number; resultadoPct: number; precoAtual: number | null };

export function avaliar(conta: ContaSimulada, precos: Record<string, number>, cdiAnual: number, hoje: string) {
  const posicoes: PosicaoAvaliada[] = conta.posicoes.map((p) => {
    if (p.tipo === "bolsa") {
      const preco = precos[p.codigo] ?? p.precoMedio;
      const custo = p.quantidade * p.precoMedio;
      const valorAtual = p.quantidade * preco;
      return { ...p, valorAtual, custo, resultado: valorAtual - custo, resultadoPct: custo > 0 ? (valorAtual / custo - 1) * 100 : 0, precoAtual: precos[p.codigo] ?? null };
    }
    const valorAtual = p.valorAplicado * fatorCdi(cdiAnual, p.aberta_em, hoje, p.pctCdi);
    return { ...p, valorAtual, custo: p.valorAplicado, resultado: valorAtual - p.valorAplicado, resultadoPct: (valorAtual / p.valorAplicado - 1) * 100, precoAtual: null };
  });
  const investido = posicoes.reduce((s, p) => s + p.valorAtual, 0);
  const total = conta.caixa + investido;
  return { posicoes, investido, total, resultado: total - conta.saldoInicial, resultadoPct: (total / conta.saldoInicial - 1) * 100, cdiNoPeriodo: conta.saldoInicial * fatorCdi(cdiAnual, conta.criada_em, hoje) };
}

export function comprar(conta: ContaSimulada, codigo: string, quantidade: number, preco: number, hoje: string, id: () => string) {
  const custo = Math.round(quantidade * preco * 100) / 100;
  if (custo > conta.caixa + 0.005) throw new Error(`Saldo insuficiente: a compra custa ${custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  const atual = conta.posicoes.find((p): p is PosicaoBolsa => p.tipo === "bolsa" && p.codigo === codigo);
  if (atual) {
    const total = atual.quantidade + quantidade;
    atual.precoMedio = (atual.precoMedio * atual.quantidade + preco * quantidade) / total;
    atual.quantidade = total;
  } else conta.posicoes.push({ id: id(), tipo: "bolsa", codigo, quantidade, precoMedio: preco, aberta_em: hoje });
  conta.caixa = Math.round((conta.caixa - custo) * 100) / 100;
  conta.operacoes.unshift({ id: id(), data: hoje, tipo: "compra", descricao: `${quantidade} ${codigo} a ${preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, valor: custo });
}

export function aplicarRendaFixa(conta: ContaSimulada, nome: string, valor: number, pctCdi: number, hoje: string, id: () => string) {
  if (valor > conta.caixa + 0.005) throw new Error("Saldo insuficiente para essa aplicação.");
  conta.posicoes.push({ id: id(), tipo: "renda_fixa", nome, valorAplicado: valor, pctCdi, aberta_em: hoje });
  conta.caixa = Math.round((conta.caixa - valor) * 100) / 100;
  conta.operacoes.unshift({ id: id(), data: hoje, tipo: "aplicacao", descricao: `${nome} (${pctCdi}% do CDI)`, valor });
}

// Vende/resgata a posição inteira pelo valor atual.
export function encerrarPosicao(conta: ContaSimulada, posicaoId: string, valorAtual: number, hoje: string, id: () => string) {
  const p = conta.posicoes.find((x) => x.id === posicaoId);
  if (!p) throw new Error("Posição não encontrada.");
  conta.posicoes = conta.posicoes.filter((x) => x.id !== posicaoId);
  conta.caixa = Math.round((conta.caixa + valorAtual) * 100) / 100;
  conta.operacoes.unshift({ id: id(), data: hoje, tipo: p.tipo === "bolsa" ? "venda" : "resgate", descricao: p.tipo === "bolsa" ? `${p.quantidade} ${p.codigo}` : p.nome, valor: Math.round(valorAtual * 100) / 100 });
  conta.operacoes = conta.operacoes.slice(0, 200);
}

// Uma foto por dia do valor da conta, do CDI e do Ibovespa (para a linha do tempo).
export function fotografar(conta: ContaSimulada, total: number, cdiValor: number, ibovAtual: number | null, hoje: string) {
  const ibov = conta.ibovInicial && ibovAtual ? (conta.saldoInicial * ibovAtual) / conta.ibovInicial : null;
  const foto = { data: hoje, valor: Math.round(total * 100) / 100, cdi: Math.round(cdiValor * 100) / 100, ibov: ibov ? Math.round(ibov * 100) / 100 : null };
  const i = conta.historico.findIndex((f) => f.data === hoje);
  if (i >= 0) conta.historico[i] = foto;
  else conta.historico.push(foto);
  conta.historico = conta.historico.slice(-400);
}
