import type { LancamentoMoedas } from "./tipos";

// Gamificação: "Norte Coins". O servidor é quem lança as moedas.
export const RECOMPENSAS = {
  entrevista: { valor: 50, rotulo: "Entrevista concluída" },
  video: { valor: 20, rotulo: "Vídeo assistido" },
  leitura: { valor: 15, rotulo: "Conteúdo lido" },
  quiz: { valor: 30, rotulo: "Quiz de módulo aprovado" },
  primeira_carteira: { valor: 50, rotulo: "Primeira carteira importada" },
  mes_positivo: { valor: 100, rotulo: "Mês positivo na carteira" },
} as const;

export type TipoRecompensa = keyof typeof RECOMPENSAS;

export const NIVEIS = [
  { nome: "Iniciante", minimo: 0 },
  { nome: "Explorador", minimo: 150 },
  { nome: "Estrategista", minimo: 400 },
  { nome: "Mestre", minimo: 800 },
];

export function resumoMoedas(lancamentos: LancamentoMoedas[]) {
  const saldo = lancamentos.reduce((s, l) => s + l.valor, 0);
  const ganhas = lancamentos.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const indice = NIVEIS.reduce((acc, n, i) => (ganhas >= n.minimo ? i : acc), 0);
  const nivel = NIVEIS[indice];
  const proximo = NIVEIS[indice + 1] ?? null;
  const progresso = proximo ? (ganhas - nivel.minimo) / (proximo.minimo - nivel.minimo) : 1;
  return { saldo, ganhas, nivel: nivel.nome, proximo, progresso: Math.min(1, Math.max(0, progresso)) };
}

export function rotuloLancamento(l: LancamentoMoedas) {
  if (l.tipo === "desbloqueio") return "Treinamento desbloqueado";
  return RECOMPENSAS[l.tipo as TipoRecompensa]?.rotulo ?? l.tipo;
}
