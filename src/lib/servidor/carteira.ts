import "server-only";
import { RECOMPENSAS } from "@/lib/dominio/moedas";
import { fechamentosMensais, totalPorClasse } from "@/lib/dominio/motor";
import type { OrigemCarteira, Posicao } from "@/lib/dominio/tipos";
import type { Repositorio } from "./repositorio";

// Salva a carteira, registra um ponto na evolução e lança as coins
// de primeira carteira e de mês positivo.
export async function registrarCarteira(
  repo: Repositorio,
  uid: string,
  origem: OrigemCarteira,
  posicoes: Posicao[],
) {
  const anteriores = await repo.listarSnapshots(uid);
  await repo.salvarCarteira(uid, origem, posicoes);

  const por_classe = totalPorClasse(posicoes);
  const total = Object.values(por_classe).reduce((s, v) => s + v, 0);
  const snapshot = { data: new Date().toISOString(), total: arredondar(total), por_classe };
  await repo.adicionarSnapshot(uid, snapshot);

  const ganhos: string[] = [];
  if (await repo.lancarMoedas(uid, "primeira_carteira", "unica", RECOMPENSAS.primeira_carteira.valor)) {
    ganhos.push(`+${RECOMPENSAS.primeira_carteira.valor} coins pela primeira carteira`);
  }

  // Mês positivo: fechamento do mês atual acima do fechamento do mês anterior registrado.
  const meses = fechamentosMensais([...anteriores, snapshot]);
  if (meses.length >= 2) {
    const atual = meses[meses.length - 1];
    const anterior = meses[meses.length - 2];
    if (
      atual.total > anterior.total &&
      (await repo.lancarMoedas(uid, "mes_positivo", atual.mes, RECOMPENSAS.mes_positivo.valor))
    ) {
      ganhos.push(`+${RECOMPENSAS.mes_positivo.valor} coins pelo mês positivo`);
    }
  }
  return ganhos;
}

function arredondar(v: number) {
  return Math.round(v * 100) / 100;
}
