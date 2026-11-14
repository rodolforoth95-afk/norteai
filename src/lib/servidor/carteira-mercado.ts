import "server-only";
import { extrairTicker } from "@/lib/dominio/classificar";
import { estadoEm, hojeBR, type CarteiraDados } from "@/lib/dominio/carteira";
import { brapiDisponivel, cotacoes, proventos } from "./brapi";
import { carregarCarteira, gravarCarteira, registrarMovimentacao } from "./carteira";
import type { Repositorio } from "./repositorio";

// Investimentos de bolsa (código + quantidade) com saldo hoje.
export function investimentosDeBolsa(c: CarteiraDados, hoje = hojeBR()) {
  return c.investimentos.filter((i) => i.quantidade && extrairTicker(i.nome) === i.nome.toUpperCase() && estadoEm(i, hoje).saldo > 0);
}

// Atualiza o saldo dos ativos de bolsa pela cotação do dia. Sem "forcar", só roda em dia
// útil e só para quem ainda não tem registro de hoje (assim a curva anda todo dia sozinha).
export async function atualizarCotacoesDoDia(repo: Repositorio, uid: string, forcar = false) {
  if (!brapiDisponivel()) return { atualizados: 0, total: 0 };
  const hoje = hojeBR();
  const diaSemana = new Date(`${hoje}T12:00:00`).getDay();
  if (!forcar && (diaSemana === 0 || diaSemana === 6)) return { atualizados: 0, total: 0 };
  const carteira = await carregarCarteira(repo, uid);
  const elegiveis = investimentosDeBolsa(carteira, hoje).filter((i) => forcar || !i.movimentacoes.some((m) => m.data === hoje && m.tipo === "saldo"));
  if (!elegiveis.length) return { atualizados: 0, total: 0 };
  const precos = await cotacoes(elegiveis.map((i) => i.nome.toUpperCase()));
  const porSimbolo = new Map(precos.map((p) => [p.simbolo, p.preco]));
  let atualizados = 0;
  for (const inv of carteira.investimentos) {
    const preco = porSimbolo.get(inv.nome.toUpperCase());
    if (!preco || !inv.quantidade || !elegiveis.some((e) => e.id === inv.id)) continue;
    registrarMovimentacao(carteira, { investimentoId: inv.id, tipo: "saldo", data: hoje, valor: preco * inv.quantidade, quantidade: inv.quantidade }, "cotacao");
    atualizados++;
  }
  const ganhos = atualizados ? await gravarCarteira(repo, uid, carteira) : [];
  return { atualizados, total: elegiveis.length, ganhos };
}

export type ProventoCarteira = { simbolo: string; data: string; tipo: string; porUnidade: number; total: number };
export type ResumoProventos = {
  ativos: { simbolo: string; quantidade: number; disponivel: boolean; recebidos12m: number }[];
  recebidos12m: number;
  mediaMensal: number;
  proximos: ProventoCarteira[];
  ultimos: ProventoCarteira[];
  porMes: { mes: string; total: number }[];
  indisponiveis: string[];
};

// Proventos dos ativos de bolsa da carteira (12 meses e próximos pagamentos), pela
// quantidade atual. Ativos que o plano da brapi não cobre ficam em "indisponiveis".
export async function proventosDaCarteira(c: CarteiraDados): Promise<ResumoProventos | null> {
  if (!brapiDisponivel()) return null;
  const hoje = hojeBR();
  const bolsa = investimentosDeBolsa(c, hoje).slice(0, 25);
  if (!bolsa.length) return null;
  const inicio = new Date(`${hoje}T12:00:00`);
  inicio.setFullYear(inicio.getFullYear() - 1);
  const umAno = inicio.toISOString().slice(0, 10);

  const ativos: ResumoProventos["ativos"] = [];
  const todos: ProventoCarteira[] = [];
  for (const inv of bolsa) {
    const simbolo = inv.nome.toUpperCase();
    const qtd = inv.quantidade ?? 0;
    const r = await proventos(simbolo);
    if (!r.disponivel) {
      ativos.push({ simbolo, quantidade: qtd, disponivel: false, recebidos12m: 0 });
      continue;
    }
    const lista = r.pagamentos.filter((p) => p.data >= umAno).map((p) => ({ simbolo, data: p.data, tipo: p.tipo, porUnidade: p.valor, total: Math.round(p.valor * qtd * 100) / 100 }));
    todos.push(...lista);
    ativos.push({ simbolo, quantidade: qtd, disponivel: true, recebidos12m: Math.round(lista.filter((p) => p.data <= hoje).reduce((s, p) => s + p.total, 0) * 100) / 100 });
  }
  const passados = todos.filter((p) => p.data <= hoje);
  const recebidos12m = Math.round(passados.reduce((s, p) => s + p.total, 0) * 100) / 100;
  const porMesMapa = new Map<string, number>();
  for (const p of passados) porMesMapa.set(p.data.slice(0, 7), (porMesMapa.get(p.data.slice(0, 7)) ?? 0) + p.total);
  const meses: { mes: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(`${hoje.slice(0, 7)}-15T12:00:00`);
    d.setMonth(d.getMonth() - i);
    const mes = d.toISOString().slice(0, 7);
    meses.push({ mes, total: Math.round((porMesMapa.get(mes) ?? 0) * 100) / 100 });
  }
  return {
    ativos,
    recebidos12m,
    mediaMensal: Math.round((recebidos12m / 12) * 100) / 100,
    proximos: todos.filter((p) => p.data > hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6),
    ultimos: passados.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6),
    porMes: meses,
    indisponiveis: ativos.filter((a) => !a.disponivel).map((a) => a.simbolo),
  };
}
