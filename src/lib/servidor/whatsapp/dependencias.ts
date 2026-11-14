import "server-only";
import { modoTesteAtivo } from "@/lib/modo-teste";
import { criarClienteAdmin } from "@/lib/supabase/servidor";
import { brapiDisponivel, cotacao } from "../brapi";
import {
  ErroFinancas,
  aportesPorMes,
  carregarFinancas,
  gravarFinancas,
} from "../financas";
import { iaDisponivel, lerLancamentoComIA } from "../ia";
import { EsquemaLancamento, aplicarLancamento } from "../lancamentos";
import { contextoIA, previaDaIA } from "../leitura-financas";
import { repositorio } from "../repositorio";
import { dentroDoLimite } from "../util";
import { conversarNoWhatsApp } from "./agente";
import { armazemWhatsApp } from "./armazem";
import type { Dependencias } from "./mordomo";
import { transcrever } from "./transcricao";

// As dependências de verdade do Mordomo: Supabase (ou arquivo no modo de teste),
// Claude, transcrição e brapi.

export function dependenciasReais(): Dependencias {
  const teste = modoTesteAtivo();
  const repo = repositorio(teste);
  return {
    armazem: armazemWhatsApp(teste),
    agora: () => new Date(),
    financas: {
      carregar: (uid) => carregarFinancas(repo, uid),
      gravar: (uid, dados) => gravarFinancas(repo, uid, dados),
      aportes: (uid) => aportesPorMes(repo, uid),
      lancar(dados, l, hoje) {
        const lido = EsquemaLancamento.safeParse({
          ...l,
          recorrente: false,
          origem: "whatsapp",
        });
        if (!lido.success)
          throw new ErroFinancas(
            lido.error.issues[0]?.message ?? "Dados inválidos.",
          );
        aplicarLancamento(dados, lido.data, hoje);
      },
    },
    async primeiroNome(uid) {
      if (teste) return "Admin";
      const { data } = await criarClienteAdmin()
        .from("usuario")
        .select("nome_completo")
        .eq("id", uid)
        .maybeSingle();
      return (data?.nome_completo ?? "").split(/\s+/)[0] ?? "";
    },
    limite: (chave) => dentroDoLimite(chave, 40, 10 * 60 * 1000),
    ia: {
      disponivel: iaDisponivel(),
      conversar: (p) => conversarNoWhatsApp({ ...p, ctx: { ...p.ctx, repo } }),
      async lerImagem(midia, dados) {
        const pdf = midia.mimetype.includes("pdf");
        if (!pdf && !/^image\/(png|jpeg|webp|gif)$/.test(midia.mimetype))
          return null;
        const r = await lerLancamentoComIA(
          { imagem: { mediaType: midia.mimetype, base64: midia.base64, pdf } },
          contextoIA(dados),
        );
        if (!r?.valor) return null;
        const p = previaDaIA(r, dados);
        if (!p.valor) return null;
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
      },
    },
    transcrever: (midia) => transcrever(midia),
    async cotacao(simbolo) {
      if (!brapiDisponivel()) return null;
      const c = await cotacao(simbolo);
      return c
        ? { preco: c.preco, variacaoPct: c.variacaoPct, nome: c.nome }
        : null;
    },
    auditarBloqueio: (uid) =>
      repo.registrarAuditoriaIA(uid, "bloqueio_regulatorio"),
  };
}
