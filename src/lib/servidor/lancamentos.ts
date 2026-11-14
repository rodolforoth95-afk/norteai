import "server-only";
import { z } from "zod";
import { novoId } from "@/lib/dominio/carteira";
import {
  aprender,
  mesDe,
  somarMeses,
  type FinancasDados,
  type Lancamento,
} from "@/lib/dominio/financas";
import { ErroFinancas } from "./financas";

// Lançar receitas e despesas (com parcelas e recorrência) e editar um lançamento.
// Usado pelo site e pelo WhatsApp, para as regras serem as mesmas nos dois.

const esquemaData = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(`${d}T12:00:00`)) &&
      d >= "2000-01-01" &&
      d <= "2100-12-31",
    "Data inválida.",
  );
const meio = z
  .enum(["pix", "debito", "credito", "dinheiro", "boleto", "transferencia"])
  .nullable();

export const EsquemaLancamento = z.object({
  id: z.string().max(60).optional(),
  tipo: z.enum(["despesa", "receita"]),
  valor: z
    .number()
    .finite()
    .positive("Informe um valor maior que zero.")
    .max(100_000_000, "Valor alto demais."),
  data: esquemaData,
  descricao: z
    .string()
    .trim()
    .min(1, "Diga do que se trata.")
    .max(60, "Descrição longa demais."),
  estabelecimento: z.string().trim().max(60).nullable(),
  categoriaId: z.string().min(1, "Escolha a categoria.").max(60),
  meio,
  parcelas: z.number().int().min(1).max(48).default(1),
  recorrente: z.boolean().default(false),
  origem: z.enum(["manual", "foto", "audio", "whatsapp"]).default("manual"),
  serie: z.boolean().default(false),
});

export type DadosLancamento = z.output<typeof EsquemaLancamento>;

export function aplicarLancamento(
  d: FinancasDados,
  l: DadosLancamento,
  hoje: string,
): { id: string; quantidade: number } {
  const categoria = d.categorias.find((c) => c.id === l.categoriaId);
  if (!categoria) throw new ErroFinancas("Categoria não encontrada.");
  if (categoria.tipo !== l.tipo)
    throw new ErroFinancas(
      `"${categoria.nome}" é uma categoria de ${categoria.tipo}.`,
    );
  if (
    !l.recorrente &&
    l.parcelas === 1 &&
    l.data > somarMeses(mesDe(hoje), 12) + "-31"
  )
    throw new ErroFinancas("A data passa de um ano à frente.");
  d.regras = aprender(
    d.regras,
    l.estabelecimento || l.descricao,
    l.categoriaId,
  );
  const agora = new Date().toISOString();

  if (l.id) {
    const atual = d.lancamentos.find((x) => x.id === l.id);
    if (!atual) throw new ErroFinancas("Lançamento não encontrado.");
    const grupo = atual.parcela?.grupo;
    if (l.serie && grupo) {
      // Na série de parcelas muda o que é comum a todas; valor e data ficam por parcela.
      d.lancamentos = d.lancamentos.map((x) =>
        x.parcela?.grupo === grupo
          ? {
              ...x,
              descricao: l.descricao,
              estabelecimento: l.estabelecimento,
              categoriaId: l.categoriaId,
              meio: l.meio,
              tipo: l.tipo,
            }
          : x,
      );
      d.lancamentos = d.lancamentos.map((x) =>
        x.id === l.id ? { ...x, valor: l.valor, data: l.data } : x,
      );
    } else {
      d.lancamentos = d.lancamentos.map((x) =>
        x.id === l.id
          ? {
              ...x,
              tipo: l.tipo,
              valor: l.valor,
              data: l.data,
              descricao: l.descricao,
              estabelecimento: l.estabelecimento,
              categoriaId: l.categoriaId,
              meio: l.meio,
              recorrente: x.parcela ? false : l.recorrente,
              fimRecorrencia: l.recorrente ? x.fimRecorrencia : null,
            }
          : x,
      );
    }
    return { id: l.id, quantidade: 1 };
  }

  const base = {
    tipo: l.tipo,
    descricao: l.descricao,
    estabelecimento: l.estabelecimento,
    categoriaId: l.categoriaId,
    meio: l.meio,
    origem: l.origem,
    criado_em: agora,
    fimRecorrencia: null,
  };
  if (l.parcelas > 1) {
    // O valor informado é o total da compra; a última parcela absorve os centavos.
    const grupo = novoId();
    const parcela = Math.floor((l.valor / l.parcelas) * 100) / 100;
    const novos: Lancamento[] = Array.from({ length: l.parcelas }, (_, i) => {
      const mes = somarMeses(mesDe(l.data), i);
      const ultimoDia = new Date(
        Number(mes.slice(0, 4)),
        Number(mes.slice(5, 7)),
        0,
      ).getDate();
      const dia = Math.min(Number(l.data.slice(8, 10)), ultimoDia);
      const valor =
        i === l.parcelas - 1
          ? Math.round((l.valor - parcela * (l.parcelas - 1)) * 100) / 100
          : parcela;
      return {
        ...base,
        id: novoId(),
        valor,
        data: `${mes}-${String(dia).padStart(2, "0")}`,
        parcela: { atual: i + 1, total: l.parcelas, grupo },
        recorrente: false,
      };
    });
    d.lancamentos.push(...novos);
    return { id: novos[0].id, quantidade: novos.length };
  }
  const novo: Lancamento = {
    ...base,
    id: novoId(),
    valor: l.valor,
    data: l.data,
    parcela: null,
    recorrente: l.recorrente,
  };
  d.lancamentos.push(novo);
  return { id: novo.id, quantidade: 1 };
}
