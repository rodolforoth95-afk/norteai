import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/servidor";
import type { Perfil, Posicao } from "@/lib/dominio/tipos";
import type { Repositorio } from "./tipo";

// Implementação no Supabase. Usa o cliente administrativo porque as gravações
// (perfil calculado, coins) não podem ser feitas pelo próprio usuário; o uid
// sempre vem da sessão verificada no servidor. O RLS protege as leituras diretas.

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
    const { data, error } = await admin
      .from("carteira")
      .select("id, origem, atualizada_em, posicao(id, classe, codigo_ou_nome, quantidade, valor_atual, data_referencia)")
      .eq("usuario_id", uid)
      .maybeSingle();
    falhar("ler carteira", error);
    if (!data) return null;
    return { origem: data.origem, atualizada_em: data.atualizada_em, posicoes: (data.posicao ?? []) as Posicao[] };
  },
  async salvarCarteira(uid, origem, posicoes) {
    const admin = criarClienteAdmin();
    const atualizada_em = new Date().toISOString();
    const { data: carteira, error } = await admin
      .from("carteira")
      .upsert({ usuario_id: uid, origem, atualizada_em }, { onConflict: "usuario_id" })
      .select("id")
      .single();
    falhar("salvar carteira", error);
    const { error: erroApagar } = await admin.from("posicao").delete().eq("carteira_id", carteira!.id);
    falhar("limpar posições", erroApagar);
    if (posicoes.length) {
      const { error: erroInserir } = await admin.from("posicao").insert(
        posicoes.map(({ classe, codigo_ou_nome, quantidade, valor_atual, data_referencia }) => ({
          carteira_id: carteira!.id,
          classe,
          codigo_ou_nome,
          quantidade,
          valor_atual,
          data_referencia,
        })),
      );
      falhar("salvar posições", erroInserir);
    }
    return { origem, atualizada_em, posicoes };
  },

  async listarSnapshots(uid) {
    const { data, error } = await criarClienteAdmin()
      .from("carteira_snapshot")
      .select("data, total, por_classe")
      .eq("usuario_id", uid)
      .order("data");
    falhar("ler evolução", error);
    return (data ?? []).map((s) => ({ ...s, total: Number(s.total) }));
  },
  async adicionarSnapshot(uid, s) {
    const { error } = await criarClienteAdmin()
      .from("carteira_snapshot")
      .insert({ usuario_id: uid, data: s.data, total: s.total, por_classe: s.por_classe });
    falhar("salvar evolução", error);
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
