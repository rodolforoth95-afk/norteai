import "server-only";
import { z } from "zod";
import { RECOMPENSAS } from "@/lib/dominio/moedas";
import {
  carteiraVazia,
  dataValida,
  estadoEm,
  hojeBR,
  novoId,
  serieMensal,
  type CarteiraDados,
  type Investimento,
  type Movimentacao,
  type OrigemMovimentacao,
  type TipoMovimentacao,
} from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";
import type { Repositorio } from "./repositorio";

// Operações da carteira. Toda alteração passa por aqui: valida, grava o documento
// inteiro e confere as coins (primeira carteira e mês com rendimento positivo).

const CLASSES = ["renda_fixa", "acoes_etfs", "fiis", "multimercado", "cripto", "exterior"] as const;
export const LIMITE_INVESTIMENTOS = 300;
const LIMITE_MOVIMENTACOES = 600;

export const esquemaData = z
  .string()
  .refine((d) => dataValida(d), "A data precisa ser hoje ou uma data passada.");
export const esquemaValor = z.number().finite().min(0, "O valor não pode ser negativo.").max(1_000_000_000, "Valor alto demais.");
export const esquemaNome = z.string().trim().min(1, "Informe o nome ou código.").max(80, "Nome longo demais.");
export const esquemaClasse = z.enum(CLASSES, { message: "Escolha a classe do investimento." });
export const esquemaQuantidade = z.number().finite().min(0).max(1_000_000_000).nullable();

export class ErroCarteira extends Error {}

export async function carregarCarteira(repo: Repositorio, uid: string) {
  return (await repo.obterCarteira(uid)) ?? carteiraVazia();
}

// Grava e devolve as mensagens de coins ganhas.
export async function gravarCarteira(repo: Repositorio, uid: string, dados: CarteiraDados) {
  if (dados.investimentos.length > LIMITE_INVESTIMENTOS) throw new ErroCarteira(`Limite de ${LIMITE_INVESTIMENTOS} investimentos.`);
  for (const inv of dados.investimentos) {
    if (inv.movimentacoes.length > LIMITE_MOVIMENTACOES) throw new ErroCarteira(`Limite de ${LIMITE_MOVIMENTACOES} movimentações em ${inv.nome}.`);
  }
  dados.atualizada_em = new Date().toISOString();
  await repo.salvarCarteira(uid, dados);

  const ganhos: string[] = [];
  if (dados.investimentos.length && (await repo.lancarMoedas(uid, "primeira_carteira", "unica", RECOMPENSAS.primeira_carteira.valor))) {
    ganhos.push(`+${RECOMPENSAS.primeira_carteira.valor} coins pela primeira carteira`);
  }
  // Mês positivo: rendimento acima de zero (sem contar dinheiro novo), nos dois últimos meses.
  for (const p of serieMensal(dados).slice(-2)) {
    if (p.rentabilidade !== null && p.rendimento > 0 && (await repo.lancarMoedas(uid, "mes_positivo", p.mes, RECOMPENSAS.mes_positivo.valor))) {
      ganhos.push(`+${RECOMPENSAS.mes_positivo.valor} coins pelo mês positivo`);
    }
  }
  return ganhos;
}

// Movimentações criadas na mesma ação ficam na ordem em que foram criadas.
function relogio() {
  const base = Date.now();
  let i = 0;
  return () => new Date(base + i++).toISOString();
}

function mov(
  tipo: TipoMovimentacao,
  data: string,
  valor: number,
  quantidade: number | null,
  origem: OrigemMovimentacao,
  criado_em: string,
): Movimentacao {
  return { id: novoId(), data, tipo, valor: Math.round(valor * 100) / 100, quantidade, origem, criado_em };
}

function acharInvestimento(c: CarteiraDados, id: string) {
  const inv = c.investimentos.find((i) => i.id === id);
  if (!inv) throw new ErroCarteira("Investimento não encontrado.");
  return inv;
}

// --- Incluir --------------------------------------------------------------------

export type NovoInvestimento = {
  nome: string;
  classe: Classe;
  tipo: string | null;
  quantidade: number | null;
  data: string; // data da aplicação
  valorAplicado: number;
  valorAtual: number | null; // se informado e diferente, vira uma atualização de saldo hoje
  origem: OrigemMovimentacao;
};

export function incluirInvestimento(c: CarteiraDados, n: NovoInvestimento) {
  if (n.valorAplicado <= 0) throw new ErroCarteira("Informe quanto você aplicou.");
  const agora = relogio();
  const hoje = hojeBR();
  const inv: Investimento = {
    id: novoId(),
    nome: n.nome,
    classe: n.classe,
    tipo: n.tipo,
    quantidade: n.quantidade,
    criado_em: new Date().toISOString(),
    movimentacoes: [mov("aplicacao", n.data, n.valorAplicado, n.quantidade, n.origem, agora())],
  };
  if (n.valorAtual !== null && Math.abs(n.valorAtual - n.valorAplicado) >= 0.01) {
    inv.movimentacoes.push(mov("saldo", n.data > hoje ? n.data : hoje, n.valorAtual, n.quantidade, n.origem, agora()));
  }
  c.investimentos.push(inv);
  return inv;
}

// --- Movimentar -----------------------------------------------------------------

export type NovaMovimentacao = {
  investimentoId: string;
  tipo: TipoMovimentacao;
  data: string;
  valor: number;
  quantidade: number | null;
};

export function registrarMovimentacao(c: CarteiraDados, n: NovaMovimentacao, origem: OrigemMovimentacao = "manual") {
  const inv = acharInvestimento(c, n.investimentoId);
  if (n.tipo !== "saldo" && n.valor <= 0) throw new ErroCarteira("Informe um valor maior que zero.");
  if (n.tipo === "resgate") {
    const saldo = estadoEm(inv, n.data).saldo;
    if (n.valor > saldo + 0.01) throw new ErroCarteira(`O resgate passa do saldo nessa data (${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`);
  }
  inv.movimentacoes.push(mov(n.tipo, n.data, n.valor, n.quantidade, origem, new Date().toISOString()));
  if (n.quantidade !== null) inv.quantidade = n.quantidade;
  return inv;
}

export function alterarMovimentacao(c: CarteiraDados, investimentoId: string, movimentacaoId: string, dados: Omit<NovaMovimentacao, "investimentoId">) {
  const inv = acharInvestimento(c, investimentoId);
  const m = inv.movimentacoes.find((x) => x.id === movimentacaoId);
  if (!m) throw new ErroCarteira("Movimentação não encontrada.");
  if (dados.tipo !== "saldo" && dados.valor <= 0) throw new ErroCarteira("Informe um valor maior que zero.");
  Object.assign(m, { tipo: dados.tipo, data: dados.data, valor: Math.round(dados.valor * 100) / 100, quantidade: dados.quantidade });
  if (estadoEm(inv, hojeBR()).saldo < 0) throw new ErroCarteira("Com essa alteração o saldo ficaria negativo.");
}

export function excluirMovimentacao(c: CarteiraDados, investimentoId: string, movimentacaoId: string) {
  const inv = acharInvestimento(c, investimentoId);
  inv.movimentacoes = inv.movimentacoes.filter((m) => m.id !== movimentacaoId);
  // Sem nenhuma movimentação, o investimento deixa de existir.
  if (!inv.movimentacoes.length) c.investimentos = c.investimentos.filter((i) => i.id !== investimentoId);
}

// --- Editar e excluir -----------------------------------------------------------

export function alterarInvestimento(c: CarteiraDados, id: string, dados: { nome: string; classe: Classe; quantidade: number | null }) {
  const inv = acharInvestimento(c, id);
  inv.nome = dados.nome;
  inv.classe = dados.classe;
  inv.quantidade = dados.quantidade;
}

export function excluirInvestimento(c: CarteiraDados, id: string) {
  acharInvestimento(c, id);
  c.investimentos = c.investimentos.filter((i) => i.id !== id);
}

// --- Importação -----------------------------------------------------------------

export type ItemImportacao = {
  acao: "novo" | "atualizar" | "ignorar";
  investimentoId: string | null;
  nome: string;
  classe: Classe;
  quantidade: number | null;
  valor: number; // saldo na data do extrato
  aplicado: number; // aplicações feitas desde a última atualização (dinheiro novo)
  resgatado: number; // resgates desde a última atualização
};

export type AusenteImportacao = { investimentoId: string; acao: "manter" | "zerar" };

// Aplica o extrato na data informada: novos entram como aplicação; os que já existem
// recebem as aplicações/resgates do período e o novo saldo; os ausentes podem ser zerados.
export function aplicarImportacao(c: CarteiraDados, data: string, origem: OrigemMovimentacao, itens: ItemImportacao[], ausentes: AusenteImportacao[]) {
  const agora = relogio();
  const resumo = { novos: 0, atualizados: 0, zerados: 0 };
  for (const item of itens) {
    if (item.acao === "ignorar") continue;
    if (item.acao === "novo") {
      if (item.valor <= 0) continue;
      c.investimentos.push({
        id: novoId(),
        nome: item.nome,
        classe: item.classe,
        tipo: null,
        quantidade: item.quantidade,
        criado_em: new Date().toISOString(),
        movimentacoes: [mov("aplicacao", data, item.valor, item.quantidade, origem, agora())],
      });
      resumo.novos++;
      continue;
    }
    const inv = acharInvestimento(c, item.investimentoId ?? "");
    if (item.aplicado > 0) inv.movimentacoes.push(mov("aplicacao", data, item.aplicado, null, origem, agora()));
    if (item.resgatado > 0) inv.movimentacoes.push(mov("resgate", data, item.resgatado, null, origem, agora()));
    inv.movimentacoes.push(mov("saldo", data, item.valor, item.quantidade, origem, agora()));
    if (item.quantidade !== null) inv.quantidade = item.quantidade;
    inv.classe = item.classe;
    resumo.atualizados++;
  }
  for (const a of ausentes) {
    if (a.acao !== "zerar") continue;
    const inv = acharInvestimento(c, a.investimentoId);
    const saldo = estadoEm(inv, data).saldo;
    if (saldo > 0) {
      inv.movimentacoes.push(mov("resgate", data, saldo, 0, origem, agora()));
      inv.quantidade = 0;
      resumo.zerados++;
    }
  }
  return resumo;
}
