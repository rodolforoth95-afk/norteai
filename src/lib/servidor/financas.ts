import "server-only";
import { CATEGORIAS_PADRAO, CORES_ANTIGAS, financasVazias, mesDe, type FinancasDados } from "@/lib/dominio/financas";
import { ErroCarteira, carregarCarteira } from "./carteira";
import type { Repositorio } from "./repositorio";

// Leitura e gravação do fluxo de caixa (um documento por pessoa), com limites de tamanho.
export const LIMITE_LANCAMENTOS = 5000;
const LIMITE_CATEGORIAS = 80;

export { ErroCarteira as ErroFinancas };

export async function carregarFinancas(repo: Repositorio, uid: string): Promise<FinancasDados> {
  const dados = (await repo.obterFinancas(uid)) ?? financasVazias();
  // Categorias padrão novas aparecem para quem já tinha o documento.
  for (const padrao of CATEGORIAS_PADRAO) {
    const atual = dados.categorias.find((c) => c.id === padrao.id);
    if (!atual) dados.categorias.push({ ...padrao });
    else if (atual.cor.toUpperCase() === CORES_ANTIGAS[padrao.id]?.toUpperCase()) atual.cor = padrao.cor;
  }
  return dados;
}

export async function gravarFinancas(repo: Repositorio, uid: string, dados: FinancasDados) {
  if (dados.lancamentos.length > LIMITE_LANCAMENTOS) throw new ErroCarteira(`Limite de ${LIMITE_LANCAMENTOS} lançamentos.`);
  if (dados.categorias.length > LIMITE_CATEGORIAS) throw new ErroCarteira(`Limite de ${LIMITE_CATEGORIAS} categorias.`);
  dados.atualizada_em = new Date().toISOString();
  await repo.salvarFinancas(uid, dados);
}

// Quanto foi aplicado na carteira em cada mês (para a linha "Reinvestido" e o progresso da meta).
export async function aportesPorMes(repo: Repositorio, uid: string) {
  const carteira = await carregarCarteira(repo, uid);
  const meses: Record<string, number> = {};
  for (const inv of carteira.investimentos) {
    for (const m of inv.movimentacoes) {
      if (m.tipo === "aplicacao") meses[mesDe(m.data)] = Math.round(((meses[mesDe(m.data)] ?? 0) + m.valor) * 100) / 100;
    }
  }
  return meses;
}
