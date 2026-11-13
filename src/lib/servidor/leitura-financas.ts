import "server-only";
import { hojeBR } from "@/lib/dominio/carteira";
import { interpretarFrase, sugerirCategoria, type FinancasDados, type Meio, type TipoLancamento } from "@/lib/dominio/financas";
import type { LancamentoIA } from "./ia";

// Prévia de lançamento devolvida à tela de confirmação (nada é salvo antes do clique).
export type Previa = {
  tipo: TipoLancamento;
  valor: number | null;
  data: string;
  descricao: string;
  estabelecimento: string | null;
  meio: Meio | null;
  parcelas: number;
  categoriaId: string;
  categoriaAprendida: boolean;
  confianca: number;
  viaIA: boolean;
};

const MEIOS = new Set(["pix", "debito", "credito", "dinheiro", "boleto", "transferencia"]);

export function contextoIA(d: FinancasDados) {
  return {
    hoje: hojeBR(),
    categorias: d.categorias.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })),
    regras: d.regras.map((r) => ({ chave: r.chave, categoriaId: r.categoriaId })),
  };
}

// Confere o que veio da IA contra a lista da pessoa e as regras aprendidas.
export function previaDaIA(r: LancamentoIA, d: FinancasDados): Previa {
  const hoje = hojeBR();
  const texto = r.estabelecimento || r.descricao;
  const sugestao = sugerirCategoria(texto, r.tipo, d);
  const valida = d.categorias.find((c) => c.id === r.categoriaId && c.tipo === r.tipo);
  const categoriaId = sugestao.aprendida || !valida ? sugestao.categoriaId : r.categoriaId;
  const data = r.data && /^\d{4}-\d{2}-\d{2}$/.test(r.data) && r.data <= hoje && r.data >= "2000-01-01" ? r.data : hoje;
  return {
    tipo: r.tipo,
    valor: r.valor && r.valor > 0 ? Math.round(r.valor * 100) / 100 : null,
    data,
    descricao: (r.descricao || r.estabelecimento || "Lançamento").slice(0, 60),
    estabelecimento: r.estabelecimento?.slice(0, 60) ?? null,
    meio: r.meio && MEIOS.has(r.meio) ? (r.meio as Meio) : null,
    parcelas: Math.min(48, Math.max(1, Math.round(r.parcelas || 1))),
    categoriaId,
    categoriaAprendida: sugestao.aprendida,
    confianca: Math.max(0, Math.min(1, r.confianca)),
    viaIA: true,
  };
}

export function previaLocal(frase: string, d: FinancasDados): Previa {
  const i = interpretarFrase(frase, hojeBR());
  const sugestao = sugerirCategoria(`${i.estabelecimento ?? ""} ${i.descricao} ${frase}`, i.tipo, d);
  return { ...i, categoriaId: sugestao.categoriaId, categoriaAprendida: sugestao.aprendida, confianca: i.valor ? 0.7 : 0.2, viaIA: false };
}
