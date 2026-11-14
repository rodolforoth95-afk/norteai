import "server-only";
import { CLASSES } from "@/lib/dominio/catalogo";
import { resumoCarteira } from "@/lib/dominio/carteira";
import {
  escadaGuardar,
  mesDe,
  nomeMes,
  normalizar,
  orcamentoDoMes,
  planosDe,
  progressoMeta,
  resumoDoMes,
  somarMeses,
  type FinancasDados,
} from "@/lib/dominio/financas";
import { AULAS } from "@/lib/conteudo/aulas";
import { brapiDisponivel, cotacoes } from "../brapi";
import { carregarCarteira } from "../carteira";
import { indicadores } from "../indicadores";
import { previaDaIA } from "../leitura-financas";
import type { Repositorio } from "../repositorio";
import { site } from "./textos";
import type { AcaoPendente, LancamentoProposto } from "./tipos";
import { resumoLancamento } from "./textos";

// Ferramentas do Mordomo: as mesmas contas do site, em formato que a IA lê.
// Nenhuma devolve nome, e-mail ou telefone da pessoa.

export type ContextoFerramentas = {
  uid: string;
  repo: Repositorio;
  dados: FinancasDados;
  hoje: string;
  aportes: Record<string, number>;
};

export type ResultadoFerramenta =
  | { tipo: "dados"; conteudo: unknown }
  | { tipo: "proposta"; acao: AcaoPendente }
  | { tipo: "erro"; mensagem: string };

const r2 = (v: number) => Math.round(v * 100) / 100;

export function nomeCategoria(d: FinancasDados, id: string) {
  return d.categorias.find((c) => c.id === id)?.nome ?? "Outros";
}

function resumoMes(ctx: ContextoFerramentas, mes: string) {
  const r = resumoDoMes(ctx.dados, mes);
  const anterior = resumoDoMes(ctx.dados, somarMeses(mes, -1));
  return {
    mes: nomeMes(mes),
    emAndamento: mes === mesDe(ctx.hoje),
    receitas: r2(r.receitas),
    despesas: r2(r.despesas),
    sobra: r2(r.saldo),
    despesasFixas: r2(r.fixas),
    despesasVariaveis: r2(r.variaveis),
    porCategoria: r.porCategoria.map((p) => ({
      categoria: nomeCategoria(ctx.dados, p.categoriaId),
      total: r2(p.total),
      mesAnterior: r2(
        anterior.porCategoria.find((x) => x.categoriaId === p.categoriaId)
          ?.total ?? 0,
      ),
    })),
    mesAnterior: {
      receitas: r2(anterior.receitas),
      despesas: r2(anterior.despesas),
      sobra: r2(anterior.saldo),
    },
  };
}

export function propostaDe(
  entrada: Record<string, unknown>,
  dados: FinancasDados,
): LancamentoProposto | null {
  const p = previaDaIA(
    {
      tipo: entrada.tipo === "receita" ? "receita" : "despesa",
      valor: typeof entrada.valor === "number" ? entrada.valor : null,
      data: typeof entrada.data === "string" ? entrada.data : null,
      estabelecimento:
        typeof entrada.estabelecimento === "string"
          ? entrada.estabelecimento
          : null,
      descricao: typeof entrada.descricao === "string" ? entrada.descricao : "",
      meio: typeof entrada.meio === "string" ? entrada.meio : null,
      parcelas: typeof entrada.parcelas === "number" ? entrada.parcelas : 1,
      categoriaId:
        typeof entrada.categoriaId === "string" ? entrada.categoriaId : "",
      confianca: 1,
    },
    dados,
  );
  if (!p.valor || p.valor > 100_000_000) return null;
  return {
    tipo: p.tipo,
    valor: p.valor,
    data: p.data,
    descricao: p.descricao,
    estabelecimento: p.estabelecimento,
    meio: p.meio,
    parcelas: p.parcelas,
    categoriaId: p.categoriaId,
  };
}

export function buscarConteudo(tema: string) {
  const palavras = normalizar(tema)
    .split(/\W+/)
    .filter((p) => p.length > 2);
  return AULAS.map((a) => {
    const titulo = normalizar(`${a.titulo} ${a.categoria}`);
    const corpo = normalizar(
      a.secoes
        .map((s) => `${s.titulo} ${(s.paragrafos ?? []).join(" ")}`)
        .join(" "),
    );
    const pontos = palavras.reduce(
      (soma, p) =>
        soma + (titulo.includes(p) ? 3 : 0) + (corpo.includes(p) ? 1 : 0),
      0,
    );
    return { a, pontos };
  })
    .filter((x) => x.pontos > 0)
    .sort((x, y) => y.pontos - x.pontos)
    .slice(0, 3)
    .map(({ a }) => ({
      titulo: a.titulo,
      link: `${site()}/aprender/${a.slug}`,
      trecho: (a.secoes[0]?.paragrafos?.[0] ?? "").slice(0, 400),
    }));
}

export async function executarFerramenta(
  nome: string,
  entrada: Record<string, unknown>,
  ctx: ContextoFerramentas,
): Promise<ResultadoFerramenta> {
  const mesAtual = mesDe(ctx.hoje);
  switch (nome) {
    case "propor_lancamento": {
      const proposta = propostaDe(entrada, ctx.dados);
      if (!proposta)
        return {
          tipo: "erro",
          mensagem: "Valor ausente ou inválido. Pergunte o valor à pessoa.",
        };
      return {
        tipo: "proposta",
        acao: { tipo: "lancar", lancamento: proposta },
      };
    }

    case "propor_apagar": {
      const id =
        typeof entrada.lancamentoId === "string" ? entrada.lancamentoId : null;
      const alvo = id
        ? ctx.dados.lancamentos.find((l) => l.id === id)
        : [...ctx.dados.lancamentos]
            .filter((l) => l.origem !== "exemplo")
            .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
      if (!alvo)
        return { tipo: "erro", mensagem: "Lançamento não encontrado." };
      return {
        tipo: "proposta",
        acao: {
          tipo: "apagar",
          lancamentoId: alvo.id,
          resumo: resumoLancamento(alvo),
        },
      };
    }

    case "resumo_do_mes": {
      const pedido =
        typeof entrada.mes === "string" && /^\d{4}-\d{2}$/.test(entrada.mes)
          ? entrada.mes
          : mesAtual;
      const mes =
        pedido > mesAtual || pedido < somarMeses(mesAtual, -24)
          ? mesAtual
          : pedido;
      return { tipo: "dados", conteudo: resumoMes(ctx, mes) };
    }

    case "ultimos_lancamentos": {
      const n = Math.min(10, Math.max(1, Number(entrada.quantidade) || 5));
      const lista = [...ctx.dados.lancamentos]
        .filter((l) => l.data <= ctx.hoje)
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) ||
            b.criado_em.localeCompare(a.criado_em),
        )
        .slice(0, n)
        .map((l) => ({
          id: l.id,
          data: l.data,
          tipo: l.tipo,
          valor: l.valor,
          descricao: l.descricao,
          categoria: nomeCategoria(ctx.dados, l.categoriaId),
        }));
      return { tipo: "dados", conteudo: lista };
    }

    case "plano_em_foco": {
      const planos = planosDe(ctx.dados);
      const meta = planos.find((m) => m.ativa) ?? null;
      if (!meta)
        return {
          tipo: "dados",
          conteudo: {
            planoEmFoco: null,
            totalDePlanos: planos.length,
            criar: `${site()}/financas/planos/novo`,
          },
        };
      const progresso = progressoMeta(ctx.dados, meta, mesAtual, ctx.aportes);
      const orcamento = orcamentoDoMes(resumoDoMes(ctx.dados, mesAtual), meta);
      const escada = meta.guardar
        ? escadaGuardar(ctx.dados, meta.guardar, mesAtual)
        : null;
      return {
        tipo: "dados",
        conteudo: {
          nome: meta.nome,
          destino: meta.destino,
          valorMensal: meta.valorMensal,
          meses: meta.meses,
          acumulado: progresso.economizado,
          objetivo: progresso.objetivo,
          percentual: Math.round(progresso.pct),
          jaAportadoNaCarteira: progresso.aportado,
          livreParaInvestir: progresso.livreParaAportar,
          metaDeGuardar: escada?.atual
            ? {
                alvoDoMesPct: escada.atual.alvoPct,
                guardadoPct: Math.round(escada.atual.guardadoPct ?? 0),
                faltaNoMes: r2(escada.faltaNoMes),
              }
            : null,
          limitesDoMes: orcamento.map((o) => ({
            categoria: nomeCategoria(ctx.dados, o.categoriaId),
            limite: r2(o.limite),
            gasto: r2(o.gasto),
            situacao: o.estado,
          })),
          link: `${site()}/financas/planos/${meta.id}`,
        },
      };
    }

    case "carteira": {
      const carteira = await carregarCarteira(ctx.repo, ctx.uid);
      const resumo = resumoCarteira(carteira, ctx.hoje);
      const ativas = resumo.linhas.filter((l) => l.saldo > 0.005);
      const porClasse = new Map<string, number>();
      for (const l of ativas)
        porClasse.set(
          l.inv.classe,
          (porClasse.get(l.inv.classe) ?? 0) + l.saldo,
        );
      return {
        tipo: "dados",
        conteudo: ativas.length
          ? {
              patrimonio: r2(resumo.patrimonio),
              aplicado: r2(resumo.aplicado),
              rendimento: r2(resumo.rendimento),
              rentabilidadeAcumuladaPct: resumo.rentabilidadeAcumulada,
              porClasse: [...porClasse].map(([classe, total]) => ({
                classe: CLASSES[classe as keyof typeof CLASSES]?.nome ?? classe,
                total: r2(total),
                pct:
                  resumo.patrimonio > 0
                    ? Math.round((total / resumo.patrimonio) * 100)
                    : 0,
              })),
              maiores: ativas.slice(0, 5).map((l) => ({
                nome: l.inv.nome,
                saldo: r2(l.saldo),
                pctCarteira: Math.round(l.pctCarteira),
              })),
              desatualizados: resumo.desatualizados.length,
              link: `${site()}/carteira`,
            }
          : { vazia: true, link: `${site()}/carteira` },
      };
    }

    case "cotacoes": {
      if (!brapiDisponivel())
        return { tipo: "erro", mensagem: "Cotações indisponíveis no momento." };
      const lista = (Array.isArray(entrada.simbolos) ? entrada.simbolos : [])
        .map((s) =>
          String(s)
            .toUpperCase()
            .replace(/[^A-Z0-9^]/g, ""),
        )
        .filter((s) => s.length >= 4 && s.length <= 7)
        .slice(0, 5);
      if (!lista.length)
        return { tipo: "erro", mensagem: "Informe o código, ex.: PETR4." };
      const r = await cotacoes(lista);
      return {
        tipo: "dados",
        conteudo: {
          cotacoes: r.map((c) => ({
            simbolo: c.simbolo,
            nome: c.nome,
            preco: c.preco,
            variacaoPctHoje: c.variacaoPct,
            minimo52Semanas: c.min52,
            maximo52Semanas: c.max52,
            horario: c.horario,
            link: `${site()}/mercado/${c.simbolo}`,
          })),
          naoEncontrados: lista.filter((s) => !r.some((c) => c.simbolo === s)),
        },
      };
    }

    case "indicadores": {
      const i = await indicadores();
      return {
        tipo: "dados",
        conteudo: {
          selicAnoPct: i.selic,
          cdiAnoPct: i.cdi,
          ipca12mPct: i.ipca12m,
          poupancaMesPct: i.poupancaMes,
          variacao3Meses: {
            ibovespaPct: i.recente.acoes3m,
            sp500EmReaisPct: i.recente.exterior3m,
            fiisPct: i.recente.fiis3m,
            bitcoinPct: i.recente.bitcoin3m,
          },
          dataJuros: i.dataJuros,
          dataIpca: i.dataIpca,
        },
      };
    }

    case "buscar_conteudo": {
      const tema =
        typeof entrada.tema === "string" ? entrada.tema.slice(0, 120) : "";
      return { tipo: "dados", conteudo: { aulas: buscarConteudo(tema) } };
    }
  }
  return { tipo: "erro", mensagem: `Ferramenta desconhecida: ${nome}` };
}
