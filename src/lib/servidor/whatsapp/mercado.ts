import "server-only";
import {
  brapiDisponivel,
  cotacoes,
  destaquesDoDia,
  indicadoresAtivo,
  listarAtivos,
  perfilEmpresa,
  tesouro,
} from "../brapi";
import { listarCriptos } from "../cripto";
import { EVENTOS_RADAR } from "@/lib/conteudo/radar";
import { intencaoMercado } from "./intencao-mercado";
import { brl, site } from "./textos";

// Dados das telas Mercado e Radar para o WhatsApp: o que a IA consulta pelas
// ferramentas e o que o Mordomo responde sozinho quando a IA está desligada.

const AVISO = "Eu não indico compra ou venda.";
const pct = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
const num = (v: number | null | undefined, casas = 2) =>
  v == null ? null : v.toFixed(casas).replace(".", ",");

export async function buscarAtivos(termo: string) {
  const itens = await listarAtivos({ busca: termo.slice(0, 40), limite: 5 });
  return itens.map((a) => ({
    simbolo: a.simbolo,
    nome: a.nome,
    tipo: a.subtipo ?? a.tipo,
    preco: a.preco,
    variacaoPctHoje: a.variacaoPct,
  }));
}

export async function detalheAtivos(simbolos: string[]) {
  const lista = simbolos.slice(0, 3);
  const base = await cotacoes(lista);
  return Promise.all(
    base.map(async (c) => {
      const acao = !c.simbolo.startsWith("^");
      const [ind, perfil] = acao
        ? await Promise.all([
            indicadoresAtivo(c.simbolo).catch(() => null),
            perfilEmpresa(c.simbolo).catch(() => null),
          ])
        : [null, null];
      return {
        simbolo: c.simbolo,
        nome: c.nome,
        preco: c.preco,
        variacaoPctHoje: c.variacaoPct,
        minimoDia: c.minDia,
        maximoDia: c.maxDia,
        minimo52Semanas: c.min52,
        maximo52Semanas: c.max52,
        precoLucro: ind?.precoLucro ?? c.pl,
        precoValorPatrimonial: ind?.precoValorPatrimonial ?? null,
        dividendYieldPct: ind?.dividendYield ?? null,
        setor: perfil?.setor ?? null,
        horario: c.horario,
        link: `${site()}/mercado/${encodeURIComponent(c.simbolo)}`,
      };
    }),
  );
}

export async function mercadoHoje() {
  const [ibov, d] = await Promise.all([
    cotacoes(["^BVSP"]).then((r) => r[0] ?? null).catch(() => null),
    destaquesDoDia(),
  ]);
  const curto = (a: { simbolo: string; nome: string; variacaoPct: number | null }) => ({
    simbolo: a.simbolo,
    nome: a.nome,
    variacaoPctHoje: a.variacaoPct,
  });
  return {
    ibovespa: ibov
      ? { pontos: ibov.preco, variacaoPctHoje: ibov.variacaoPct }
      : null,
    maioresAltas: d.altas.slice(0, 5).map(curto),
    maioresBaixas: d.baixas.slice(0, 5).map(curto),
    maisNegociadas: d.maisNegociadas.slice(0, 5).map(curto),
    link: `${site()}/mercado`,
  };
}

export async function criptosPrincipais() {
  const lista = await listarCriptos(5);
  return {
    criptos: lista.map((c) => ({
      nome: c.nome,
      simbolo: c.simbolo,
      precoReais: c.preco,
      variacao24hPct: c.variacao24h,
      variacao7dPct: c.variacao7d,
    })),
    link: `${site()}/mercado/cripto`,
  };
}

export async function tesouroDireto() {
  const titulos = await tesouro();
  return {
    titulos: titulos.map((t) => ({
      nome: t.nome,
      taxaCompraPct: t.taxaCompra,
      precoCompra: t.precoCompra,
    })),
    link: `${site()}/mercado`,
  };
}

export function agendaRadar(hoje: string) {
  const eventos = EVENTOS_RADAR.filter((e) => e.data >= hoje)
    .slice(0, 6)
    .map((e) => ({
      data: e.data,
      hora: e.hora ?? null,
      titulo: e.titulo,
      resumo: e.resumo,
      esperado: e.esperado ?? null,
      impacto: e.impacto,
    }));
  const fechamentos = EVENTOS_RADAR.filter(
    (e) => e.tipo === "fechamento" && e.resultado && e.data <= hoje,
  )
    .slice(-3)
    .map((e) => ({ data: e.data, titulo: e.titulo, resultado: e.resultado }));
  return { eventos, fechamentos, link: `${site()}/radar` };
}

function dataBR(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

// Resposta pronta (sem IA) quando a mensagem é sobre o mercado; null se não for.
export async function responderMercado(
  texto: string,
  hoje: string,
): Promise<string | null> {
  const intencao = intencaoMercado(texto);
  if (!intencao) return null;
  if (intencao.tipo === "radar") {
    const a = agendaRadar(hoje);
    if (!a.eventos.length && !a.fechamentos.length)
      return `A agenda do Radar Findomo desta semana ainda não foi publicada. Acompanhe em ${a.link}.`;
    const linhas = [
      ...a.eventos.map(
        (e) =>
          `• ${dataBR(e.data)}${e.hora ? ` ${e.hora}` : ""}: *${e.titulo}*${e.esperado ? ` (esperado: ${e.esperado})` : ""}`,
      ),
      ...a.fechamentos.map((e) => `• ${dataBR(e.data)}: ${e.titulo}: ${e.resultado}`),
    ];
    return ["*Radar Findomo*", linhas.join("\n"), `Mais em ${a.link}`].join("\n\n");
  }
  if (!brapiDisponivel())
    return `Os dados de mercado estão indisponíveis agora. Veja em ${site()}/mercado.`;
  try {
    if (intencao.tipo === "cripto") {
      const c = await criptosPrincipais();
      return [
        "*Criptomoedas agora*",
        c.criptos
          .map((x) => `• *${x.nome}* (${x.simbolo}): ${brl(x.precoReais)}, ${pct(x.variacao24hPct)} em 24h`)
          .join("\n"),
        AVISO,
        `Mais em ${c.link}`,
      ].join("\n\n");
    }
    if (intencao.tipo === "tesouro") {
      const t = await tesouroDireto();
      if (!t.titulos.length)
        return `Não consegui as taxas do Tesouro agora. Veja em ${t.link}.`;
      return [
        "*Tesouro Direto*",
        t.titulos
          .map(
            (x) =>
              `• *${x.nome}*: taxa de ${num(x.taxaCompraPct) ?? "—"}%${x.precoCompra ? `, ${brl(x.precoCompra)}` : ""}`,
          )
          .join("\n"),
        'Para entender cada título, pergunte por exemplo "o que é Tesouro Selic?".',
        `Mais em ${t.link}`,
      ].join("\n\n");
    }
    if (intencao.tipo === "mercado_hoje") {
      const m = await mercadoHoje();
      const linha = (a: { simbolo: string; variacaoPctHoje: number | null }) =>
        `• ${a.simbolo}: ${pct(a.variacaoPctHoje)}`;
      return [
        m.ibovespa
          ? `*Ibovespa*: ${m.ibovespa.pontos.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pontos, ${pct(m.ibovespa.variacaoPctHoje)} hoje.`
          : "*Bolsa hoje*",
        m.maioresAltas.length
          ? `*Maiores altas*\n${m.maioresAltas.slice(0, 3).map(linha).join("\n")}`
          : "",
        m.maioresBaixas.length
          ? `*Maiores baixas*\n${m.maioresBaixas.slice(0, 3).map(linha).join("\n")}`
          : "",
        AVISO,
        `Mais em ${m.link}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    let simbolos =
      intencao.tipo === "ativos" ? intencao.simbolos : [];
    if (intencao.tipo === "buscar") {
      const achados = await buscarAtivos(intencao.termo);
      if (!achados.length)
        return `Não achei "${intencao.termo}" na B3. Me mande o código do ativo (ex.: PETR4) ou procure em ${site()}/mercado.`;
      simbolos = [achados[0].simbolo];
    }
    const lista = await detalheAtivos(simbolos);
    if (!lista.length)
      return `Não consegui a cotação de ${simbolos.join(", ")} agora. Veja em ${site()}/mercado.`;
    const blocos = lista.map((a) => {
      const extras = [
        a.precoLucro != null ? `P/L: ${num(a.precoLucro, 1)}` : null,
        a.dividendYieldPct != null ? `Dividendos: ${num(a.dividendYieldPct, 1)}% ao ano` : null,
        a.minimo52Semanas != null && a.maximo52Semanas != null
          ? `52 semanas: ${brl(a.minimo52Semanas)} a ${brl(a.maximo52Semanas)}`
          : null,
      ].filter(Boolean);
      return [
        `*${a.simbolo}* · ${a.nome}${a.setor ? ` (${a.setor})` : ""}\n${brl(a.preco)}, ${pct(a.variacaoPctHoje)} hoje`,
        extras.length ? extras.join("\n") : null,
        a.link,
      ]
        .filter(Boolean)
        .join("\n\n");
    });
    return [
      ...blocos,
      AVISO,
      "Quer entender o P/L ou os dividendos? É só perguntar.",
    ].join("\n\n");
  } catch {
    return `Não consegui os dados de mercado agora. Veja em ${site()}/mercado.`;
  }
}
