import "server-only";
import { randomUUID } from "node:crypto";
import { totalPorClasse } from "@/lib/dominio/motor";
import type { Classe, Posicao, Snapshot } from "@/lib/dominio/tipos";

// Carteira fictícia do modo de teste, com histórico de 4 meses (inclui um mês negativo).
const POSICOES: [Classe, string, number | null, number][] = [
  ["renda_fixa", "Tesouro Selic 2029", null, 5200],
  ["renda_fixa", "CDB pós-fixado 110% CDI", null, 3600],
  ["renda_fixa", "LCI 95% CDI", null, 1500],
  ["acoes_etfs", "BOVA11", 15, 2050],
  ["acoes_etfs", "PETR4", 32, 1150],
  ["fiis", "HGLG11", 8, 1220],
  ["exterior", "IVVB11", 4, 1480],
  ["cripto", "HASH11", 9, 620],
];

const HISTORICO: [string, number][] = [
  ["2026-07-03T12:00:00.000Z", 15000],
  ["2026-08-04T12:00:00.000Z", 15620],
  ["2026-09-03T12:00:00.000Z", 15410],
  ["2026-10-02T12:00:00.000Z", 16480],
];

export function carteiraExemplo() {
  const hoje = new Date().toISOString().slice(0, 10);
  const posicoes: Posicao[] = POSICOES.map(([classe, codigo_ou_nome, quantidade, valor_atual]) => ({
    id: randomUUID(),
    classe,
    codigo_ou_nome,
    quantidade,
    valor_atual,
    data_referencia: hoje,
  }));
  const atual = totalPorClasse(posicoes);
  const totalAtual = Object.values(atual).reduce((s, v) => s + v, 0);

  const escalar = (total: number) =>
    Object.fromEntries(
      Object.entries(atual).map(([c, v]) => [c, Math.round((v / totalAtual) * total * 100) / 100]),
    ) as Record<Classe, number>;

  const snapshots: Snapshot[] = [
    ...HISTORICO.map(([data, total]) => ({ data, total, por_classe: escalar(total) })),
    { data: new Date().toISOString(), total: totalAtual, por_classe: atual },
  ];
  return { posicoes, snapshots };
}
