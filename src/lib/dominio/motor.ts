// Motor de cálculo. Todo número exibido no app sai daqui, nunca da IA.

import { FAIXAS, ORDEM_CLASSES } from "./catalogo";
import type { Classe, Estilo, Perfil, Posicao, Respostas, Snapshot } from "./tipos";

// --- 6.1 Estilo de investidor (educacional) ---------------------------------

const PONTOS: Record<string, Record<string, number>> = {
  horizonte: { "Até 2 anos": 0, "De 2 a 5 anos": 1, "Mais de 5 anos": 2 },
  reserva_meses: { "Menos de 1 mês": 0, "1 a 3 meses": 1, "3 a 6 meses": 2, "Mais de 6 meses": 2 },
  reacao_queda: {
    "Vendia tudo para não perder mais": 0,
    "Vendia uma parte": 1,
    "Esperava passar": 2,
    "Colocava mais dinheiro": 3,
  },
};

export type ResultadoEstilo = {
  pontuacao: number;
  estilo: Estilo;
  travado: boolean;
  detalhes: { campo: string; resposta: string; pontos: number }[];
  motivoTrava: string | null;
};

export function calcularEstilo(r: Respostas): ResultadoEstilo {
  const detalhes = (["horizonte", "reserva_meses", "reacao_queda"] as const).map((campo) => ({
    campo,
    resposta: r[campo] ?? "",
    pontos: PONTOS[campo][r[campo] ?? ""] ?? 0,
  }));
  const pontuacao = detalhes.reduce((s, d) => s + d.pontos, 0);
  const porPontos: Estilo = pontuacao <= 2 ? "Cauteloso" : pontuacao <= 5 ? "Equilibrado" : "Ousado";

  const motivoTrava =
    r.tem_divida_cara === "Sim"
      ? "Você tem dívida cara. Até quitá-la, o estilo fica em Cauteloso."
      : r.reserva_meses === "Menos de 1 mês"
        ? "Sua reserva cobre menos de 1 mês. Até completá-la, o estilo fica em Cauteloso."
        : null;

  return {
    pontuacao,
    estilo: motivoTrava ? "Cauteloso" : porPontos,
    travado: Boolean(motivoTrava) && porPontos !== "Cauteloso",
    detalhes,
    motivoTrava,
  };
}

// --- Primeiro passo ------------------------------------------------------------

export function primeiroPasso(r: Respostas) {
  if (r.tem_divida_cara === "Sim") {
    return {
      titulo: "Comece quitando dívidas caras",
      texto:
        "Juros de cartão e cheque especial costumam passar de 100% ao ano, muito acima do que qualquer investimento rende. Quitar essas dívidas é o melhor retorno garantido.",
    };
  }
  if (r.reserva_meses === "Menos de 1 mês" || r.reserva_meses === "1 a 3 meses") {
    return {
      titulo: "Complete sua reserva de emergência",
      texto: "A referência é ter de 3 a 6 meses de gastos guardados, em algo seguro e que você possa resgatar rápido.",
    };
  }
  return { titulo: "Defina suas metas", texto: "Dê nome, valor e prazo para seus objetivos." };
}

// --- Carteira: composição, aderência (6.3) e pontos de atenção (6.4) ------------

export function totalPorClasse(posicoes: Posicao[]): Record<Classe, number> {
  const total = Object.fromEntries(ORDEM_CLASSES.map((c) => [c, 0])) as Record<Classe, number>;
  for (const p of posicoes) total[p.classe] += p.valor_atual;
  return total;
}

export function percentuais(porClasse: Record<Classe, number>) {
  const total = Object.values(porClasse).reduce((s, v) => s + v, 0);
  const pct = Object.fromEntries(
    ORDEM_CLASSES.map((c) => [c, total > 0 ? (porClasse[c] / total) * 100 : 0]),
  ) as Record<Classe, number>;
  return { total, pct };
}

// Renda fixa / renda variável / cripto, arredondados para somar exatamente 100.
export function composicaoPrincipal(porClasse: Record<Classe, number>) {
  const { total } = percentuais(porClasse);
  const grupos = {
    renda_fixa: porClasse.renda_fixa,
    renda_variavel: porClasse.acoes_etfs + porClasse.fiis + porClasse.multimercado + porClasse.exterior,
    cripto: porClasse.cripto,
  };
  return { total, valores: grupos, pct: arredondarPara100(grupos, total) };
}

function arredondarPara100<K extends string>(valores: Record<K, number>, total: number): Record<K, number> {
  const chaves = Object.keys(valores) as K[];
  if (total <= 0) return Object.fromEntries(chaves.map((k) => [k, 0])) as Record<K, number>;
  const brutos = chaves.map((k) => ({ k, v: (valores[k] / total) * 100 }));
  const base = brutos.map((b) => ({ ...b, inteiro: Math.floor(b.v) }));
  let resto = 100 - base.reduce((s, b) => s + b.inteiro, 0);
  base
    .sort((a, b) => b.v - b.inteiro - (a.v - a.inteiro))
    .forEach((b) => {
      if (resto > 0) {
        b.inteiro += 1;
        resto -= 1;
      }
    });
  return Object.fromEntries(base.map((b) => [b.k, b.inteiro])) as Record<K, number>;
}

export type StatusFaixa = "Abaixo da faixa" | "Dentro da faixa" | "Acima da faixa";

export function calcularAderencia(pct: Record<Classe, number>, estilo: Estilo) {
  const faixas = FAIXAS[estilo];
  const linhas = ORDEM_CLASSES.map((classe) => {
    const atual = pct[classe];
    const { min, max } = faixas[classe];
    const desvio = atual < min ? min - atual : atual > max ? atual - max : 0;
    const status: StatusFaixa = atual < min ? "Abaixo da faixa" : atual > max ? "Acima da faixa" : "Dentro da faixa";
    return { classe, atual, min, max, desvio, status };
  });
  const somaDesvios = linhas.reduce((s, l) => s + l.desvio, 0);
  const aderencia = Math.max(0, Math.round(100 - somaDesvios));

  // Mais arriscada ou mais conservadora que a referência?
  const riscoAcima = linhas
    .filter((l) => l.classe !== "renda_fixa" && l.status === "Acima da faixa")
    .reduce((s, l) => s + l.desvio, 0);
  const rf = linhas[0];
  const leitura =
    aderencia >= 90
      ? `Sua carteira está próxima da referência do estilo ${estilo}.`
      : riscoAcima > 0 || rf.status === "Abaixo da faixa"
        ? `Sua carteira está mais arriscada que a referência do estilo ${estilo}.`
        : `Sua carteira está mais conservadora que a referência do estilo ${estilo}.`;

  return { aderencia, linhas, leitura };
}

export type PontoAtencao = { texto: string; link: string };

export function pontosDeAtencao(posicoes: Posicao[], perfil: Perfil | null): PontoAtencao[] {
  const pontos: PontoAtencao[] = [];
  const porClasse = totalPorClasse(posicoes);
  const { total, pct } = percentuais(porClasse);
  if (total <= 0) return pontos;

  const maior = [...posicoes].sort((a, b) => b.valor_atual - a.valor_atual)[0];
  const pctMaior = (maior.valor_atual / total) * 100;
  if (pctMaior > 20) {
    pontos.push({
      texto: `Um único investimento (${maior.codigo_ou_nome}) representa ${formatarPct(pctMaior)} da sua carteira. Veja o que é concentração.`,
      link: "/aprender/diversificacao",
    });
  }

  const r = perfil?.respostas;
  const rvCripto = 100 - pct.renda_fixa;
  if (r?.horizonte === "Até 2 anos" && rvCripto > 30) {
    pontos.push({
      texto: "Parte do seu dinheiro está em investimentos que oscilam bastante, e seu objetivo é de curto prazo.",
      link: "/aprender/acoes_etfs",
    });
  }
  if (r && (r.reserva_meses === "Menos de 1 mês" || r.reserva_meses === "1 a 3 meses")) {
    pontos.push({
      texto: "Antes de arriscar mais, a referência é ter de 3 a 6 meses de gastos guardados.",
      link: "/aprender/renda_fixa",
    });
  }
  if (perfil && pct.cripto > FAIXAS[perfil.estilo].cripto.max) {
    pontos.push({
      texto: `Cripto ocupa ${formatarPct(pct.cripto)} da carteira, acima da faixa de referência do seu estilo.`,
      link: "/aprender/cripto",
    });
  }
  return pontos;
}

// --- Evolução da carteira ------------------------------------------------------

export type MarcoEvolucao = { rotulo: string; data: string; total: number; variacao: number | null };

// Compara o início da carteira com 1, 2 e 3 meses depois e com hoje.
export function marcosDeEvolucao(snapshots: Snapshot[]): MarcoEvolucao[] {
  if (snapshots.length === 0) return [];
  const ordenados = [...snapshots].sort((a, b) => a.data.localeCompare(b.data));
  const inicio = ordenados[0];
  const marcos: MarcoEvolucao[] = [{ rotulo: "Início", data: inicio.data, total: inicio.total, variacao: null }];

  for (const meses of [1, 2, 3]) {
    const alvo = adicionarMeses(new Date(inicio.data), meses);
    const encontrado = ordenados.find((s) => new Date(s.data) >= alvo);
    if (encontrado && encontrado !== inicio) {
      marcos.push({
        rotulo: meses === 1 ? "1 mês" : `${meses} meses`,
        data: encontrado.data,
        total: encontrado.total,
        variacao: variacao(inicio.total, encontrado.total),
      });
    }
  }

  const ultimo = ordenados[ordenados.length - 1];
  if (ultimo !== inicio && !marcos.some((m) => m.data === ultimo.data)) {
    marcos.push({ rotulo: "Hoje", data: ultimo.data, total: ultimo.total, variacao: variacao(inicio.total, ultimo.total) });
  }
  return marcos;
}

// Último registro de cada mês, para o gráfico e para o "mês positivo".
export function fechamentosMensais(snapshots: Snapshot[]) {
  const porMes = new Map<string, Snapshot>();
  for (const s of [...snapshots].sort((a, b) => a.data.localeCompare(b.data))) {
    porMes.set(s.data.slice(0, 7), s);
  }
  return [...porMes.entries()].map(([mes, s]) => ({ mes, total: s.total, data: s.data }));
}

export function variacao(de: number, para: number) {
  return de > 0 ? ((para - de) / de) * 100 : null;
}

function adicionarMeses(d: Date, meses: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + meses);
  return r;
}

// --- Formatação ------------------------------------------------------------------

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL_CURTO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatarReais(v: number, curto = false) {
  return (curto ? BRL_CURTO : BRL).format(v);
}

export function formatarPct(v: number, casas = 0) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function formatarVariacao(v: number | null) {
  if (v === null) return "—";
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${formatarPct(Math.abs(v), 1)}`;
}

export function nomeMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}
