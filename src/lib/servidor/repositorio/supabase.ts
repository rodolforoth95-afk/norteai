import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/servidor";
import type { Perfil, Posicao } from "@/lib/dominio/tipos";
import { deVersaoAnterior, type CarteiraDados } from "@/lib/dominio/carteira";
import type { FinancasDados } from "@/lib/dominio/financas";
import type { ContaSimulada } from "@/lib/dominio/conta-simulada";
import { ErroCarteira } from "../carteira";
import type { Repositorio } from "./tipo";

// Implementação no Supabase. Usa o cliente administrativo porque as gravações
// (perfil calculado, coins) não podem ser feitas pelo próprio usuário; o uid
// sempre vem da sessão verificada no servidor. O RLS protege as leituras diretas.

const TABELA_INEXISTENTE = "PGRST205";

function falhar(contexto: string, erro: { code?: string } | null) {
  if (erro) throw new Error(`[norteia] ${contexto} (${erro.code ?? "erro"})`);
}

export const repositorioSupabase: Repositorio = {
  async obterEntrevista(uid) {
    const { data, error } = await criarClienteAdmin()
      .from("entrevista")
      .select("respostas, status, atualizada_em")
      .eq("usuario_id", uid)
      .maybeSingle();
    falhar("ler entrevista", error);
    return data ? { respostas: data.respostas, concluida: data.status === "concluida", atualizada_em: data.atualizada_em } : null;
  },
  async salvarEntrevista(uid, estado) {
    const { error } = await criarClienteAdmin()
      .from("entrevista")
      .upsert({
        usuario_id: uid,
        respostas: estado.respostas,
        status: estado.concluida ? "concluida" : "em_andamento",
        atualizada_em: estado.atualizada_em,
        concluida_em: estado.concluida ? estado.atualizada_em : null,
      });
    falhar("salvar entrevista", error);
  },

  async obterPerfil(uid) {
    const { data, error } = await criarClienteAdmin()
      .from("perfil")
      .select("versao, respostas, pontuacao, estilo, travado, criado_em")
      .eq("usuario_id", uid)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    falhar("ler perfil", error);
    return (data as Perfil | null) ?? null;
  },
  async salvarPerfil(uid, novo) {
    const atual = await this.obterPerfil(uid);
    const { data, error } = await criarClienteAdmin()
      .from("perfil")
      .insert({ usuario_id: uid, versao: (atual?.versao ?? 0) + 1, ...novo })
      .select("versao, respostas, pontuacao, estilo, travado, criado_em")
      .single();
    falhar("salvar perfil", error);
    return data as Perfil;
  },

  async obterCarteira(uid) {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.from("carteira_v2").select("dados").eq("usuario_id", uid).maybeSingle();
    // Tabela ainda não criada (migração 0004 pendente): segue com a carteira antiga.
    if (error?.code !== TABELA_INEXISTENTE) falhar("ler carteira", error);
    if (data) return data.dados as CarteiraDados;

    // Carteira da versão anterior (só posições): converte para o novo formato.
    const antiga = await admin
      .from("carteira")
      .select("atualizada_em, posicao(id, classe, codigo_ou_nome, quantidade, valor_atual, data_referencia)")
      .eq("usuario_id", uid)
      .maybeSingle();
    if (antiga.error || !antiga.data?.posicao?.length) return null;
    const convertida = deVersaoAnterior(antiga.data.posicao as Posicao[], antiga.data.atualizada_em.slice(0, 10));
    // Grava a conversão uma vez, para os identificadores não mudarem a cada leitura.
    if (error?.code !== TABELA_INEXISTENTE) {
      await admin.from("carteira_v2").upsert({ usuario_id: uid, dados: convertida, atualizada_em: new Date().toISOString() }, { onConflict: "usuario_id", ignoreDuplicates: true });
      const gravada = await admin.from("carteira_v2").select("dados").eq("usuario_id", uid).maybeSingle();
      if (gravada.data) return gravada.data.dados as CarteiraDados;
    }
    return convertida;
  },
  async salvarCarteira(uid, dados) {
    const { error } = await criarClienteAdmin()
      .from("carteira_v2")
      .upsert({ usuario_id: uid, dados, atualizada_em: new Date().toISOString() }, { onConflict: "usuario_id" });
    if (error?.code === TABELA_INEXISTENTE) {
      throw new ErroCarteira("O banco de dados precisa ser atualizado (migração 0004) antes de salvar a carteira.");
    }
    falhar("salvar carteira", error);
  },

  async obterFinancas(uid) {
    const { data, error } = await criarClienteAdmin().from("financas").select("dados").eq("usuario_id", uid).maybeSingle();
    if (error?.code === TABELA_INEXISTENTE) return null;
    falhar("ler finanças", error);
    return (data?.dados as FinancasDados) ?? null;
  },
  async salvarFinancas(uid, dados) {
    const { error } = await criarClienteAdmin()
      .from("financas")
      .upsert({ usuario_id: uid, dados, atualizada_em: new Date().toISOString() }, { onConflict: "usuario_id" });
    if (error?.code === TABELA_INEXISTENTE) {
      throw new ErroCarteira("O banco de dados precisa ser atualizado (migração 0005) antes de salvar receitas e despesas.");
    }
    falhar("salvar finanças", error);
  },

  async obterContaSimulada(uid) {
    const { data, error } = await criarClienteAdmin().from("conta_simulada").select("dados").eq("usuario_id", uid).maybeSingle();
    if (error?.code === TABELA_INEXISTENTE) return null;
    falhar("ler conta simulada", error);
    return (data?.dados as ContaSimulada) ?? null;
  },
  async salvarContaSimulada(uid, dados) {
    const cliente = criarClienteAdmin().from("conta_simulada");
    const { error } = dados
      ? await cliente.upsert({ usuario_id: uid, dados, atualizada_em: new Date().toISOString() }, { onConflict: "usuario_id" })
      : await cliente.delete().eq("usuario_id", uid);
    if (error?.code === TABELA_INEXISTENTE) {
      throw new ErroCarteira("O banco de dados precisa ser atualizado (migração 0006) antes de usar a conta simulada.");
    }
    falhar("salvar conta simulada", error);
  },

  async listarMoedas(uid) {
    const { data, error } = await criarClienteAdmin()
      .from("moeda_lancamento")
      .select("tipo, referencia, valor, criado_em")
      .eq("usuario_id", uid)
      .order("criado_em");
    falhar("ler coins", error);
    return data ?? [];
  },
  async lancarMoedas(uid, tipo, referencia, valor) {
    const { error } = await criarClienteAdmin()
      .from("moeda_lancamento")
      .insert({ usuario_id: uid, tipo, referencia, valor });
    if (error?.code === "23505") return false; // já lançado (único por tipo + referência)
    falhar("lançar coins", error);
    return true;
  },

  async listarConcluidos(uid) {
    const { data, error } = await criarClienteAdmin().from("conclusao").select("chave").eq("usuario_id", uid);
    falhar("ler progresso", error);
    return (data ?? []).map((c) => c.chave);
  },
  async marcarConcluido(uid, chave) {
    const { error } = await criarClienteAdmin()
      .from("conclusao")
      .upsert({ usuario_id: uid, chave }, { onConflict: "usuario_id,chave", ignoreDuplicates: true });
    falhar("salvar progresso", error);
  },

  async registrarAuditoriaIA(uid, tipo) {
    const { error } = await criarClienteAdmin().from("auditoria_ia").insert({ usuario_id: uid, tipo });
    falhar("registrar auditoria", error);
  },
};
