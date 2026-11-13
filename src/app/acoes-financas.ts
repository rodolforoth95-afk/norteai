"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hojeBR, novoId } from "@/lib/dominio/carteira";
import {
  aprender,
  chaveEstabelecimento,
  diagnosticar,
  exemploFinancas,
  mesDe,
  nomeMes,
  planejar,
  somarMeses,
  type FinancasDados,
  type Lancamento,
} from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { ErroFinancas, carregarFinancas, gravarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel, planoComIA } from "@/lib/servidor/ia";
import { registrarErro } from "@/lib/servidor/util";

// Ações do fluxo de caixa: lançar (com parcelas e recorrência), editar, excluir,
// categorias, regras aprendidas, meta de economia e dados de exemplo.

type Resposta = { ok: true; id?: string; quantidade?: number } | { erro: string };

async function executar(alterar: (d: FinancasDados, hoje: string) => { id?: string; quantidade?: number } | void): Promise<Resposta> {
  try {
    const { uid, repo } = await exigirUsuario();
    const dados = await carregarFinancas(repo, uid);
    const extra = alterar(dados, hojeBR()) ?? {};
    await gravarFinancas(repo, uid, dados);
    revalidatePath("/", "layout");
    return { ok: true, ...extra };
  } catch (e) {
    if (e instanceof ErroFinancas) return { erro: e.message };
    registrarErro("financas", e instanceof Error ? e.message.slice(0, 80) : undefined);
    return { erro: "Não foi possível salvar agora. Tente de novo." };
  }
}

function erroDe(r: z.ZodSafeParseError<unknown>) {
  return { erro: r.error.issues[0]?.message ?? "Dados inválidos." };
}

const esquemaData = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").refine((d) => !Number.isNaN(Date.parse(`${d}T12:00:00`)) && d >= "2000-01-01" && d <= "2100-12-31", "Data inválida.");
const meio = z.enum(["pix", "debito", "credito", "dinheiro", "boleto", "transferencia"]).nullable();

const EsquemaLancamento = z.object({
  id: z.string().max(60).optional(),
  tipo: z.enum(["despesa", "receita"]),
  valor: z.number().finite().positive("Informe um valor maior que zero.").max(100_000_000, "Valor alto demais."),
  data: esquemaData,
  descricao: z.string().trim().min(1, "Diga do que se trata.").max(60, "Descrição longa demais."),
  estabelecimento: z.string().trim().max(60).nullable(),
  categoriaId: z.string().min(1, "Escolha a categoria.").max(60),
  meio,
  parcelas: z.number().int().min(1).max(48).default(1),
  recorrente: z.boolean().default(false),
  origem: z.enum(["manual", "foto", "audio"]).default("manual"),
  serie: z.boolean().default(false),
});

export async function salvarLancamento(entrada: z.input<typeof EsquemaLancamento>) {
  const lido = EsquemaLancamento.safeParse(entrada);
  if (!lido.success) return erroDe(lido);
  const l = lido.data;
  return executar((d, hoje) => {
    const categoria = d.categorias.find((c) => c.id === l.categoriaId);
    if (!categoria) throw new ErroFinancas("Categoria não encontrada.");
    if (categoria.tipo !== l.tipo) throw new ErroFinancas(`"${categoria.nome}" é uma categoria de ${categoria.tipo}.`);
    if (!l.recorrente && l.parcelas === 1 && l.data > somarMeses(mesDe(hoje), 12) + "-31") throw new ErroFinancas("A data passa de um ano à frente.");
    d.regras = aprender(d.regras, l.estabelecimento || l.descricao, l.categoriaId);
    const agora = new Date().toISOString();

    if (l.id) {
      const atual = d.lancamentos.find((x) => x.id === l.id);
      if (!atual) throw new ErroFinancas("Lançamento não encontrado.");
      const grupo = atual.parcela?.grupo;
      if (l.serie && grupo) {
        // Na série de parcelas muda o que é comum a todas; valor e data ficam por parcela.
        d.lancamentos = d.lancamentos.map((x) =>
          x.parcela?.grupo === grupo ? { ...x, descricao: l.descricao, estabelecimento: l.estabelecimento, categoriaId: l.categoriaId, meio: l.meio, tipo: l.tipo } : x,
        );
        d.lancamentos = d.lancamentos.map((x) => (x.id === l.id ? { ...x, valor: l.valor, data: l.data } : x));
      } else {
        d.lancamentos = d.lancamentos.map((x) =>
          x.id === l.id
            ? { ...x, tipo: l.tipo, valor: l.valor, data: l.data, descricao: l.descricao, estabelecimento: l.estabelecimento, categoriaId: l.categoriaId, meio: l.meio, recorrente: x.parcela ? false : l.recorrente, fimRecorrencia: l.recorrente ? x.fimRecorrencia : null }
            : x,
        );
      }
      return { id: l.id, quantidade: 1 };
    }

    const base = { tipo: l.tipo, descricao: l.descricao, estabelecimento: l.estabelecimento, categoriaId: l.categoriaId, meio: l.meio, origem: l.origem, criado_em: agora, fimRecorrencia: null };
    if (l.parcelas > 1) {
      // O valor informado é o total da compra; a última parcela absorve os centavos.
      const grupo = novoId();
      const parcela = Math.floor((l.valor / l.parcelas) * 100) / 100;
      const novos: Lancamento[] = Array.from({ length: l.parcelas }, (_, i) => {
        const mes = somarMeses(mesDe(l.data), i);
        const ultimoDia = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
        const dia = Math.min(Number(l.data.slice(8, 10)), ultimoDia);
        const valor = i === l.parcelas - 1 ? Math.round((l.valor - parcela * (l.parcelas - 1)) * 100) / 100 : parcela;
        return { ...base, id: novoId(), valor, data: `${mes}-${String(dia).padStart(2, "0")}`, parcela: { atual: i + 1, total: l.parcelas, grupo }, recorrente: false };
      });
      d.lancamentos.push(...novos);
      return { id: novos[0].id, quantidade: novos.length };
    }
    const novo: Lancamento = { ...base, id: novoId(), valor: l.valor, data: l.data, parcela: null, recorrente: l.recorrente };
    d.lancamentos.push(novo);
    return { id: novo.id, quantidade: 1 };
  });
}

export async function excluirLancamento(id: string, modo: "este" | "serie" = "este") {
  return executar((d) => {
    const atual = d.lancamentos.find((x) => x.id === id);
    if (!atual) throw new ErroFinancas("Lançamento não encontrado.");
    const grupo = atual.parcela?.grupo;
    d.lancamentos = d.lancamentos.filter((x) => (modo === "serie" && grupo ? x.parcela?.grupo !== grupo : x.id !== id));
  });
}

// Para de repetir um lançamento recorrente a partir de um mês (o mês anterior é o último).
export async function encerrarRecorrencia(id: string, aPartirDe: string) {
  if (!/^\d{4}-\d{2}$/.test(aPartirDe)) return { erro: "Mês inválido." };
  return executar((d) => {
    const atual = d.lancamentos.find((x) => x.id === id && x.recorrente);
    if (!atual) throw new ErroFinancas("Lançamento recorrente não encontrado.");
    if (aPartirDe <= mesDe(atual.data)) d.lancamentos = d.lancamentos.filter((x) => x.id !== id);
    else atual.fimRecorrencia = somarMeses(aPartirDe, -1);
  });
}

// --- Categorias e regras ---------------------------------------------------------------

const EsquemaCategoria = z.object({
  id: z.string().max(60).optional(),
  nome: z.string().trim().min(2, "Nome curto demais.").max(30, "Nome longo demais."),
  tipo: z.enum(["despesa", "receita"]),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  icone: z.string().regex(/^[A-Za-z]{2,30}$/).default("Tag"),
  paiId: z.string().max(60).nullable().default(null),
  essencial: z.boolean().default(false),
});

export async function salvarCategoria(entrada: z.input<typeof EsquemaCategoria>) {
  const lido = EsquemaCategoria.safeParse(entrada);
  if (!lido.success) return erroDe(lido);
  const c = lido.data;
  return executar((d) => {
    const repetida = d.categorias.find((x) => x.nome.toLowerCase() === c.nome.toLowerCase() && x.tipo === c.tipo && x.id !== c.id);
    if (repetida) throw new ErroFinancas("Já existe uma categoria com esse nome.");
    if (c.paiId) {
      const pai = d.categorias.find((x) => x.id === c.paiId);
      if (!pai || pai.paiId || pai.tipo !== c.tipo || pai.id === c.id) throw new ErroFinancas("Categoria principal inválida.");
    }
    if (c.id) {
      const atual = d.categorias.find((x) => x.id === c.id);
      if (!atual) throw new ErroFinancas("Categoria não encontrada.");
      Object.assign(atual, { nome: c.nome, cor: c.cor, icone: c.icone, essencial: c.essencial, paiId: atual.padrao ? null : c.paiId });
      return { id: atual.id };
    }
    const pai = c.paiId ? d.categorias.find((x) => x.id === c.paiId) : null;
    const id = `c-${novoId().slice(0, 8)}`;
    d.categorias.push({ id, nome: c.nome, tipo: c.tipo, grupo: c.tipo === "receita" ? "receita" : (pai?.grupo ?? (c.essencial ? "fixa" : "variavel")), cor: c.cor, icone: c.icone, paiId: c.paiId, padrao: false, essencial: c.essencial || Boolean(pai?.essencial) });
    return { id };
  });
}

export async function excluirCategoria(id: string) {
  return executar((d) => {
    const cat = d.categorias.find((x) => x.id === id);
    if (!cat) throw new ErroFinancas("Categoria não encontrada.");
    if (cat.padrao) throw new ErroFinancas("Categorias padrão não podem ser excluídas.");
    const destino = cat.paiId ?? (cat.tipo === "receita" ? "outras-receitas" : "outros");
    const filhas = new Set([id, ...d.categorias.filter((x) => x.paiId === id).map((x) => x.id)]);
    let movidos = 0;
    d.lancamentos = d.lancamentos.map((l) => (filhas.has(l.categoriaId) ? (movidos++, { ...l, categoriaId: destino }) : l));
    d.regras = d.regras.filter((r) => !filhas.has(r.categoriaId));
    d.categorias = d.categorias.filter((x) => !filhas.has(x.id));
    return { quantidade: movidos };
  });
}

export async function excluirRegra(chave: string) {
  return executar((d) => {
    d.regras = d.regras.filter((r) => r.chave !== chaveEstabelecimento(chave) && r.chave !== chave);
  });
}

// --- Meta de economia (Mordomo Estrategista) -----------------------------------------------

const EsquemaMeta = z.object({
  nome: z.string().trim().min(2, "Dê um nome à meta.").max(60),
  destino: z.string().trim().min(2, "Para onde vai o dinheiro?").max(40),
  valorMensal: z.number().finite().min(10, "A meta mínima é R$ 10 por mês.").max(1_000_000),
  meses: z.number().int().min(1).max(120),
  dias: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(90),
});

export async function salvarMeta(entrada: z.input<typeof EsquemaMeta>) {
  const lido = EsquemaMeta.safeParse(entrada);
  if (!lido.success) return erroDe(lido);
  const m = lido.data;
  return executar((d, hoje) => {
    const plano = planejar(diagnosticar(d, mesDe(hoje), m.dias), m.valorMensal, m.meses);
    d.metas = d.metas.map((x) => ({ ...x, ativa: false }));
    const id = novoId();
    d.metas.push({ id, nome: m.nome, destino: m.destino, valorMensal: m.valorMensal, meses: m.meses, inicio: mesDe(hoje), cortes: plano.cortes, ativa: true, criada_em: new Date().toISOString() });
    d.metas = d.metas.slice(-20);
    return { id };
  });
}

export async function encerrarMeta(id: string) {
  return executar((d) => {
    const meta = d.metas.find((x) => x.id === id);
    if (!meta) throw new ErroFinancas("Meta não encontrada.");
    meta.ativa = false;
  });
}

// --- Exemplo ---------------------------------------------------------------------------

export async function carregarExemploFinancas() {
  return executar((d, hoje) => {
    if (d.lancamentos.some((l) => l.origem === "exemplo")) throw new ErroFinancas("Os dados de exemplo já estão carregados.");
    const lista = exemploFinancas(hoje, novoId);
    d.lancamentos.push(...lista);
    return { quantidade: lista.length };
  });
}

export async function apagarExemploFinancas() {
  return executar((d) => {
    const antes = d.lancamentos.length;
    d.lancamentos = d.lancamentos.filter((l) => l.origem !== "exemplo");
    d.metas = d.metas.filter((m) => !m.nome.startsWith("[Exemplo]"));
    return { quantidade: antes - d.lancamentos.length };
  });
}

// --- Plano escrito pelo Mordomo (IA) -------------------------------------------------------

export async function gerarPlanoIA(entrada: { valorMensal: number; meses: number; destino: string; dias: 30 | 60 | 90 }): Promise<{ texto: string } | { erro: string }> {
  const lido = EsquemaMeta.omit({ nome: true }).safeParse(entrada);
  if (!lido.success) return erroDe(lido);
  if (!iaDisponivel()) return { erro: "A IA ainda não está ligada neste ambiente." };
  try {
    const { uid, repo } = await exigirUsuario();
    const d = await carregarFinancas(repo, uid);
    const hoje = hojeBR();
    const diag = diagnosticar(d, mesDe(hoje), lido.data.dias);
    const plano = planejar(diag, lido.data.valorMensal, lido.data.meses);
    const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? "Outros";
    const brl = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
    const resumo = [
      `Período analisado: ${diag.meses.map((m) => nomeMes(m)).join(", ") || "sem histórico"}.`,
      `Receita média: ${brl(diag.receitaMedia)}/mês. Despesa média: ${brl(diag.despesaMedia)}/mês (fixas ${brl(diag.fixasMedia)}, variáveis ${brl(diag.variaveisMedia)}). Sobra média: ${brl(diag.sobraMedia)}/mês.`,
      `Ralos: ${diag.ralos.map((r) => `${nome(r.categoriaId)} ${brl(r.mediaMensal)}/mês (${Math.round(r.pctDespesas)}% das despesas)`).join("; ") || "nenhum relevante"}.`,
      `Assinaturas: ${diag.assinaturas.map((a) => `${a.descricao} ${brl(a.valorMensal)}`).join(", ") || "nenhuma"}.`,
      `Meta: ${brl(plano.metaMensal)}/mês por ${lido.data.meses} meses para ${lido.data.destino} (total ${brl(plano.totalNoPeriodo)}).`,
      `Proposta de cortes: ${plano.cortes.map((c) => `${nome(c.categoriaId)} −${c.percentual}% (${brl(c.corteMensal)}/mês, limite ${brl(c.limiteMensal)})`).join("; ") || "nenhum corte necessário"}.`,
      `Com os cortes a pessoa ${plano.atingivel ? "atinge" : "não atinge totalmente"} a meta (sobra ${brl(plano.sobraAtual)} + cortes ${brl(plano.cortado)}).`,
    ].join("\n");
    const texto = await planoComIA(resumo);
    return texto ? { texto } : { erro: "O Mordomo não conseguiu escrever o plano agora." };
  } catch (e) {
    registrarErro("plano ia", e instanceof Error ? e.name : undefined);
    return { erro: "O Mordomo não conseguiu escrever o plano agora." };
  }
}
