"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { extrairTicker } from "@/lib/dominio/classificar";
import { estadoEm, hojeBR } from "@/lib/dominio/carteira";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { brapiDisponivel, cotacoes, tagAtivo } from "@/lib/servidor/brapi";
import { carteiraExemplo } from "@/lib/servidor/exemplo";
import { registrarErro } from "@/lib/servidor/util";
import {
  ErroCarteira,
  alterarInvestimento,
  alterarMovimentacao,
  aplicarImportacao,
  carregarCarteira,
  esquemaClasse,
  esquemaData,
  esquemaNome,
  esquemaQuantidade,
  esquemaValor,
  excluirInvestimento,
  excluirMovimentacao,
  gravarCarteira,
  incluirInvestimento,
  registrarMovimentacao,
} from "@/lib/servidor/carteira";

// Ações da carteira: incluir, movimentar, editar, excluir, importar e atualizar
// pelas cotações. Toda data é validada no servidor (nunca depois de hoje).

type Resposta = { ok: true; ganhos: string[]; id?: string; resumo?: Record<string, number> } | { erro: string };

async function executar(alterar: Parameters<typeof comCarteira>[0]): Promise<Resposta> {
  try {
    return await comCarteira(alterar);
  } catch (e) {
    if (e instanceof ErroCarteira) return { erro: e.message };
    registrarErro("carteira", e instanceof Error ? e.message.slice(0, 80) : undefined);
    return { erro: "Não foi possível salvar agora. Tente de novo." };
  }
}

async function comCarteira(
  alterar: (c: Awaited<ReturnType<typeof carregarCarteira>>) => { id?: string; resumo?: Record<string, number> } | void,
): Promise<Resposta> {
  const { uid, repo } = await exigirUsuario();
  const carteira = await carregarCarteira(repo, uid);
  const extra = alterar(carteira) ?? {};
  const ganhos = await gravarCarteira(repo, uid, carteira);
  revalidatePath("/", "layout");
  return { ok: true, ganhos, ...extra };
}

function erroDe(r: z.ZodSafeParseError<unknown>) {
  return { erro: r.error.issues[0]?.message ?? "Dados inválidos." };
}

const tipoMov = z.enum(["aplicacao", "resgate", "saldo"]);

// --- Incluir --------------------------------------------------------------------

const EsquemaNovo = z.object({
  nome: esquemaNome,
  classe: esquemaClasse,
  tipo: z.string().max(40).nullable(),
  quantidade: esquemaQuantidade,
  data: esquemaData,
  valorAplicado: esquemaValor,
  valorAtual: esquemaValor.nullable(),
});

export async function salvarNovoInvestimento(dados: z.input<typeof EsquemaNovo>) {
  const lido = EsquemaNovo.safeParse(dados);
  if (!lido.success) return erroDe(lido);
  return executar((c) => ({ id: incluirInvestimento(c, { ...lido.data, origem: "manual" }).id }));
}

// --- Movimentações --------------------------------------------------------------

const EsquemaMov = z.object({
  investimentoId: z.string().uuid(),
  tipo: tipoMov,
  data: esquemaData,
  valor: esquemaValor,
  quantidade: esquemaQuantidade,
});

export async function salvarMovimentacao(dados: z.input<typeof EsquemaMov>) {
  const lido = EsquemaMov.safeParse(dados);
  if (!lido.success) return erroDe(lido);
  return executar((c) => void registrarMovimentacao(c, lido.data));
}

const EsquemaEdicaoMov = EsquemaMov.extend({ movimentacaoId: z.string().uuid() });

export async function editarMovimentacao(dados: z.input<typeof EsquemaEdicaoMov>) {
  const lido = EsquemaEdicaoMov.safeParse(dados);
  if (!lido.success) return erroDe(lido);
  const { investimentoId, movimentacaoId, ...resto } = lido.data;
  return executar((c) => void alterarMovimentacao(c, investimentoId, movimentacaoId, resto));
}

export async function apagarMovimentacao(investimentoId: string, movimentacaoId: string) {
  if (!z.string().uuid().safeParse(investimentoId).success || !z.string().uuid().safeParse(movimentacaoId).success) return { erro: "Dados inválidos." };
  return executar((c) => void excluirMovimentacao(c, investimentoId, movimentacaoId));
}

// --- Editar e excluir -----------------------------------------------------------

const EsquemaEdicao = z.object({ id: z.string().uuid(), nome: esquemaNome, classe: esquemaClasse, quantidade: esquemaQuantidade });

export async function editarInvestimento(dados: z.input<typeof EsquemaEdicao>) {
  const lido = EsquemaEdicao.safeParse(dados);
  if (!lido.success) return erroDe(lido);
  const { id, ...resto } = lido.data;
  return executar((c) => void alterarInvestimento(c, id, resto));
}

export async function apagarInvestimento(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { erro: "Dados inválidos." };
  return executar((c) => void excluirInvestimento(c, id));
}

// --- Importação -----------------------------------------------------------------

const EsquemaImportacao = z.object({
  data: esquemaData,
  origem: z.enum(["pdf", "planilha", "imagem", "manual"]),
  itens: z
    .array(
      z.object({
        acao: z.enum(["novo", "atualizar", "ignorar"]),
        investimentoId: z.string().uuid().nullable(),
        nome: esquemaNome,
        classe: esquemaClasse,
        quantidade: esquemaQuantidade,
        valor: esquemaValor,
        aplicado: esquemaValor,
        resgatado: esquemaValor,
      }),
    )
    .max(300),
  ausentes: z.array(z.object({ investimentoId: z.string().uuid(), acao: z.enum(["manter", "zerar"]) })).max(300),
});

export async function confirmarImportacao(dados: z.input<typeof EsquemaImportacao>) {
  const lido = EsquemaImportacao.safeParse(dados);
  if (!lido.success) return erroDe(lido);
  const { data, origem, itens, ausentes } = lido.data;
  if (!itens.some((i) => i.acao !== "ignorar") && !ausentes.some((a) => a.acao === "zerar")) {
    return { erro: "Nada para salvar: marque pelo menos um investimento." };
  }
  return executar((c) => ({ resumo: aplicarImportacao(c, data, origem, itens, ausentes) }));
}

// --- Cotações -------------------------------------------------------------------

// Atualiza o saldo dos investimentos com código de negociação e quantidade pela cotação
// da brapi (atraso de até 30 min), com a data de hoje.
export async function atualizarPelasCotacoes() {
  if (!brapiDisponivel()) return { erro: "Cotações indisponíveis no momento." };
  const { uid, repo } = await exigirUsuario();
  const carteira = await carregarCarteira(repo, uid);
  const hoje = hojeBR();
  const elegiveis = carteira.investimentos.filter(
    (i) => i.quantidade && extrairTicker(i.nome) === i.nome.toUpperCase() && estadoEm(i, hoje).saldo > 0,
  );
  if (!elegiveis.length) return { erro: "Nenhum investimento com código de bolsa e quantidade para atualizar." };

  for (const i of elegiveis) revalidateTag(tagAtivo(i.nome));
  let precos: Awaited<ReturnType<typeof cotacoes>>;
  try {
    precos = await cotacoes(elegiveis.map((i) => i.nome.toUpperCase()));
  } catch {
    return { erro: "Não foi possível buscar as cotações agora. Tente mais tarde." };
  }
  const porSimbolo = new Map(precos.map((p) => [p.simbolo, p.preco]));
  let atualizados = 0;
  const r = await executar((c) => {
    for (const inv of c.investimentos) {
      const preco = porSimbolo.get(inv.nome.toUpperCase());
      if (!preco || !inv.quantidade || !elegiveis.some((e) => e.id === inv.id)) continue;
      registrarMovimentacao(c, { investimentoId: inv.id, tipo: "saldo", data: hoje, valor: preco * inv.quantidade, quantidade: inv.quantidade }, "cotacao");
      atualizados++;
    }
    return { resumo: { atualizados, total: elegiveis.length } };
  });
  return r;
}

// --- Modo de teste --------------------------------------------------------------

export async function carregarCarteiraExemplo() {
  const { uid, repo, teste } = await exigirUsuario();
  if (!teste) return { erro: "Disponível só no modo de teste." };
  await repo.salvarCarteira(uid, carteiraExemplo());
  revalidatePath("/", "layout");
  return { ok: true };
}
