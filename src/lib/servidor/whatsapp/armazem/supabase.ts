import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/servidor";
import type { AcaoPendente, Vinculo } from "../tipos";
import type { ArmazemWhatsApp } from "./tipo";

// Implementação no Supabase (migração 0007). Sempre pelo cliente administrativo: quem
// chega pelo WhatsApp não tem sessão; a identidade vem do vínculo verificado por código.

const ERRO_UNICO = "23505";

function falhar(contexto: string, erro: { code?: string } | null) {
  if (erro)
    throw new Error(`[norteia] whatsapp ${contexto} (${erro.code ?? "erro"})`);
}

type LinhaVinculo = {
  usuario_id: string;
  telefone: string;
  lid: string | null;
  jid: string;
  nome_whatsapp: string | null;
  avisos: boolean;
  consentido_em: string;
  vinculado_em: string;
};

const CAMPOS_VINCULO =
  "usuario_id, telefone, lid, jid, nome_whatsapp, avisos, consentido_em, vinculado_em";

function vinculoDe(l: LinhaVinculo | null): Vinculo | null {
  return l
    ? {
        usuarioId: l.usuario_id,
        telefone: l.telefone,
        lid: l.lid,
        jid: l.jid,
        nomeWhatsapp: l.nome_whatsapp,
        avisos: l.avisos,
        consentidoEm: l.consentido_em,
        vinculadoEm: l.vinculado_em,
      }
    : null;
}

async function vinculoOnde(
  coluna: "telefone" | "lid" | "usuario_id",
  valor: string,
) {
  const { data, error } = await criarClienteAdmin()
    .from("whatsapp_vinculo")
    .select(CAMPOS_VINCULO)
    .eq(coluna, valor)
    .maybeSingle();
  falhar("ler vínculo", error);
  return vinculoDe(data as LinhaVinculo | null);
}

export const armazemSupabase: ArmazemWhatsApp = {
  vinculoPorTelefone: (telefone) => vinculoOnde("telefone", telefone),
  vinculoPorLid: (lid) => vinculoOnde("lid", lid),
  vinculoDoUsuario: (usuarioId) => vinculoOnde("usuario_id", usuarioId),

  async vincular(v) {
    const admin = criarClienteAdmin();
    const outros = admin
      .from("whatsapp_vinculo")
      .delete()
      .neq("usuario_id", v.usuarioId);
    const r1 = await (v.lid
      ? outros.or(`telefone.eq.${v.telefone},lid.eq.${v.lid}`)
      : outros.eq("telefone", v.telefone));
    falhar("liberar número", r1.error);
    const { error } = await admin.from("whatsapp_vinculo").upsert({
      usuario_id: v.usuarioId,
      telefone: v.telefone,
      lid: v.lid,
      jid: v.jid,
      nome_whatsapp: v.nomeWhatsapp,
      avisos: v.avisos,
      consentido_em: v.consentidoEm,
      vinculado_em: new Date().toISOString(),
    });
    falhar("vincular", error);
  },
  async desvincular(usuarioId) {
    const admin = criarClienteAdmin();
    const r = await admin
      .from("whatsapp_vinculo")
      .delete()
      .eq("usuario_id", usuarioId);
    falhar("desvincular", r.error);
    await admin.from("whatsapp_pendente").delete().eq("usuario_id", usuarioId);
  },
  async alterarAvisos(usuarioId, avisos) {
    const { error } = await criarClienteAdmin()
      .from("whatsapp_vinculo")
      .update({ avisos })
      .eq("usuario_id", usuarioId);
    falhar("avisos", error);
  },

  async criarCodigo(usuarioId, codigo, expiraEm) {
    const admin = criarClienteAdmin();
    await admin.from("whatsapp_codigo").delete().eq("usuario_id", usuarioId);
    const { error } = await admin
      .from("whatsapp_codigo")
      .insert({ codigo, usuario_id: usuarioId, expira_em: expiraEm });
    if (error?.code === ERRO_UNICO) throw new Error("codigo_repetido");
    falhar("criar código", error);
  },
  async consumirCodigo(codigo, agora) {
    const { data, error } = await criarClienteAdmin()
      .from("whatsapp_codigo")
      .delete()
      .eq("codigo", codigo)
      .select("usuario_id, expira_em")
      .maybeSingle();
    falhar("consumir código", error);
    return data && data.expira_em > agora ? (data.usuario_id as string) : null;
  },

  async registrarEntrada(m) {
    const admin = criarClienteAdmin();
    const { data, error } = await admin
      .from("whatsapp_mensagem")
      .insert({
        message_id: m.messageId,
        usuario_id: m.usuarioId,
        telefone: m.telefone,
        direcao: "entrada",
        tipo: m.tipo,
        texto: m.texto.slice(0, 4000),
        status: "processando",
      })
      .select("id, status, criado_em")
      .single();
    if (error?.code === ERRO_UNICO) {
      const existente = await admin
        .from("whatsapp_mensagem")
        .select("id, status, criado_em")
        .eq("message_id", m.messageId)
        .single();
      falhar("ler mensagem repetida", existente.error);
      return {
        id: existente.data!.id,
        novo: false,
        status: existente.data!.status,
        criadoEm: existente.data!.criado_em,
      };
    }
    falhar("registrar entrada", error);
    return {
      id: data!.id,
      novo: true,
      status: data!.status,
      criadoEm: data!.criado_em,
    };
  },
  async atualizarEntrada(id, dados) {
    const { error } = await criarClienteAdmin()
      .from("whatsapp_mensagem")
      .update({
        status: dados.status,
        ...(dados.texto !== undefined
          ? { texto: dados.texto.slice(0, 4000) }
          : {}),
        ...(dados.usuarioId !== undefined
          ? { usuario_id: dados.usuarioId }
          : {}),
      })
      .eq("id", id);
    falhar("atualizar entrada", error);
  },
  async registrarSaidas(m) {
    if (!m.textos.length) return;
    const { error } = await criarClienteAdmin()
      .from("whatsapp_mensagem")
      .insert(
        m.textos.map((texto) => ({
          usuario_id: m.usuarioId,
          telefone: m.telefone,
          direcao: "saida",
          tipo: "texto",
          texto: texto.slice(0, 4000),
          status: "enviada",
          resposta_de: m.respostaDe,
        })),
      );
    falhar("registrar saída", error);
  },
  async respostasDe(entradaId) {
    const { data, error } = await criarClienteAdmin()
      .from("whatsapp_mensagem")
      .select("texto")
      .eq("resposta_de", entradaId)
      .order("criado_em");
    falhar("ler respostas", error);
    return (data ?? []).map((l) => l.texto as string);
  },
  async historico(usuarioId, desde, limite) {
    const { data, error } = await criarClienteAdmin()
      .from("whatsapp_mensagem")
      .select("direcao, texto, criado_em")
      .eq("usuario_id", usuarioId)
      .gte("criado_em", desde)
      .neq("texto", "")
      .order("criado_em", { ascending: false })
      .limit(limite);
    falhar("ler histórico", error);
    return (data ?? []).reverse().map((l) => ({
      direcao: l.direcao,
      texto: l.texto,
      criadoEm: l.criado_em,
    }));
  },

  async obterPendente(usuarioId, agora) {
    const { data, error } = await criarClienteAdmin()
      .from("whatsapp_pendente")
      .select("acao, expira_em")
      .eq("usuario_id", usuarioId)
      .maybeSingle();
    falhar("ler pendente", error);
    return data && data.expira_em > agora ? (data.acao as AcaoPendente) : null;
  },
  async salvarPendente(usuarioId, acao, expiraEm) {
    const { error } = await criarClienteAdmin()
      .from("whatsapp_pendente")
      .upsert({
        usuario_id: usuarioId,
        acao,
        expira_em: expiraEm,
        criado_em: new Date().toISOString(),
      });
    falhar("salvar pendente", error);
  },
  async limparPendente(usuarioId) {
    const { error } = await criarClienteAdmin()
      .from("whatsapp_pendente")
      .delete()
      .eq("usuario_id", usuarioId);
    falhar("limpar pendente", error);
  },

  async obterCanal() {
    const { data, error } = await criarClienteAdmin()
      .from("whatsapp_canal")
      .select("status, qr, numero, nome, comando, atualizado_em")
      .eq("id", 1)
      .maybeSingle();
    falhar("ler canal", error);
    return data
      ? {
          status: data.status,
          qr: data.qr,
          numero: data.numero,
          nome: data.nome,
          comando: data.comando,
          atualizadoEm: data.atualizado_em,
        }
      : null;
  },
  async informarCanal(e) {
    const admin = criarClienteAdmin();
    const atual = await admin
      .from("whatsapp_canal")
      .select("comando")
      .eq("id", 1)
      .maybeSingle();
    const { error } = await admin.from("whatsapp_canal").upsert({
      id: 1,
      status: e.status,
      qr: e.qr,
      numero: e.numero,
      nome: e.nome,
      comando: null,
      atualizado_em: new Date().toISOString(),
    });
    falhar("informar canal", error);
    return (atual.data?.comando as "desconectar" | null) ?? null;
  },
  async pedirComando(comando) {
    const { error } = await criarClienteAdmin()
      .from("whatsapp_canal")
      .upsert({ id: 1, comando });
    falhar("comando canal", error);
  },

  async limpar() {
    const { error } = await criarClienteAdmin().rpc("limpar_whatsapp");
    falhar("limpar", error);
  },
};
