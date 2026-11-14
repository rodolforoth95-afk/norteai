"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hojeBR, novoId } from "@/lib/dominio/carteira";
import { extrairTicker } from "@/lib/dominio/classificar";
import { aplicarRendaFixa, avaliar, comprar, encerrarPosicao, novaConta, type ContaSimulada } from "@/lib/dominio/conta-simulada";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { brapiDisponivel, cotacao, cotacoes } from "@/lib/servidor/brapi";
import { indicadores } from "@/lib/servidor/indicadores";
import { ErroCarteira } from "@/lib/servidor/carteira";
import { registrarErro } from "@/lib/servidor/util";

type Resposta = { ok: true } | { erro: string };

async function comConta(alterar: (c: ContaSimulada, hoje: string) => Promise<void> | void): Promise<Resposta> {
  try {
    const { uid, repo } = await exigirUsuario();
    const conta = await repo.obterContaSimulada(uid);
    if (!conta) return { erro: "Crie a conta simulada primeiro." };
    await alterar(conta, hojeBR());
    await repo.salvarContaSimulada(uid, conta);
    revalidatePath("/simulador/conta");
    return { ok: true };
  } catch (e) {
    if (e instanceof ErroCarteira) return { erro: e.message };
    if (e instanceof Error && !/fetch|ECONN|brapi/i.test(e.message)) return { erro: e.message };
    registrarErro("conta simulada", e instanceof Error ? e.message.slice(0, 80) : undefined);
    return { erro: "Não foi possível concluir agora. Tente de novo." };
  }
}

export async function criarContaSimulada(saldoInicial: number): Promise<Resposta> {
  if (![10_000, 50_000, 100_000].includes(saldoInicial)) return { erro: "Escolha um saldo inicial." };
  try {
    const { uid, repo } = await exigirUsuario();
    const ibov = brapiDisponivel() ? await cotacao("^BVSP").then((c) => c.preco).catch(() => null) : null;
    await repo.salvarContaSimulada(uid, novaConta(saldoInicial, hojeBR(), ibov));
    revalidatePath("/simulador/conta");
    return { ok: true };
  } catch (e) {
    if (e instanceof ErroCarteira) return { erro: e.message };
    return { erro: "Não foi possível criar a conta agora." };
  }
}

const EsquemaCompra = z.object({ codigo: z.string().trim().min(4).max(12), quantidade: z.number().int("Use uma quantidade inteira.").positive("Informe a quantidade.").max(1_000_000) });

export async function comprarAtivo(entrada: z.input<typeof EsquemaCompra>) {
  const lido = EsquemaCompra.safeParse(entrada);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  const codigo = extrairTicker(lido.data.codigo);
  if (!codigo) return { erro: "Use o código do ativo, como PETR4, MXRF11 ou BOVA11." };
  if (!brapiDisponivel()) return { erro: "Cotações indisponíveis no momento." };
  return comConta(async (c, hoje) => {
    const preco = await cotacao(codigo).then((x) => x.preco).catch(() => null);
    if (!preco) throw new Error(`Não encontrei cotação para ${codigo}.`);
    comprar(c, codigo, lido.data.quantidade, preco, hoje, novoId);
  });
}

const EsquemaRendaFixa = z.object({ nome: z.string().trim().min(2).max(40), valor: z.number().positive("Informe o valor.").max(10_000_000), pctCdi: z.number().min(50).max(150) });

export async function aplicarRendaFixaSimulada(entrada: z.input<typeof EsquemaRendaFixa>) {
  const lido = EsquemaRendaFixa.safeParse(entrada);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  return comConta((c, hoje) => aplicarRendaFixa(c, lido.data.nome, lido.data.valor, lido.data.pctCdi, hoje, novoId));
}

export async function encerrarPosicaoSimulada(posicaoId: string) {
  return comConta(async (c, hoje) => {
    const codigos = c.posicoes.flatMap((p) => (p.tipo === "bolsa" && p.id === posicaoId ? [p.codigo] : []));
    const precos = codigos.length && brapiDisponivel() ? Object.fromEntries((await cotacoes(codigos)).map((x) => [x.simbolo, x.preco])) : {};
    const ind = await indicadores();
    const av = avaliar(c, precos, ind.cdi, hoje).posicoes.find((p) => p.id === posicaoId);
    if (!av) throw new Error("Posição não encontrada.");
    encerrarPosicao(c, posicaoId, av.valorAtual, hoje, novoId);
  });
}

export async function reiniciarContaSimulada(): Promise<Resposta> {
  const { uid, repo } = await exigirUsuario();
  await repo.salvarContaSimulada(uid, null);
  revalidatePath("/simulador/conta");
  return { ok: true };
}
