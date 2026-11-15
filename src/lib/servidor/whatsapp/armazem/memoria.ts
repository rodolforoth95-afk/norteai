import { randomUUID } from "node:crypto";
import type {
  AcaoPendente,
  ConfigWhatsApp,
  EstadoCanal,
  StatusMensagem,
  Vinculo,
} from "../tipos";
import type { ArmazemWhatsApp } from "./tipo";

// Estado completo do WhatsApp num objeto simples. Base do armazém em arquivo (modo de
// teste) e dos testes automáticos.
export type DadosWhatsApp = {
  vinculos: Vinculo[];
  codigos: { codigo: string; usuarioId: string; expiraEm: string }[];
  mensagens: {
    id: string;
    messageId: string | null;
    usuarioId: string | null;
    telefone: string;
    direcao: "entrada" | "saida";
    tipo: string;
    texto: string;
    status: StatusMensagem;
    respostaDe: string | null;
    criadoEm: string;
  }[];
  pendentes: { usuarioId: string; acao: AcaoPendente; expiraEm: string }[];
  canal: EstadoCanal | null;
  config: ConfigWhatsApp;
};

export function dadosVazios(): DadosWhatsApp {
  return {
    vinculos: [],
    codigos: [],
    mensagens: [],
    pendentes: [],
    canal: null,
    config: { atendimento: true, mensagemPausa: null },
  };
}

const NOVENTA_DIAS = 90 * 24 * 60 * 60 * 1000;

export function armazemSobre(
  ler: () => Promise<DadosWhatsApp>,
  gravar: (d: DadosWhatsApp) => Promise<void>,
  relogio: () => Date = () => new Date(),
): ArmazemWhatsApp {
  async function alterar<T>(fn: (d: DadosWhatsApp) => T): Promise<T> {
    const d = await ler();
    const r = fn(d);
    await gravar(d);
    return r;
  }
  const agora = () => relogio().toISOString();

  return {
    async vinculoPorTelefone(telefone) {
      return (
        (await ler()).vinculos.find((v) => v.telefone === telefone) ?? null
      );
    },
    async vinculoPorLid(lid) {
      return (await ler()).vinculos.find((v) => v.lid === lid) ?? null;
    },
    async vinculoDoUsuario(usuarioId) {
      return (
        (await ler()).vinculos.find((v) => v.usuarioId === usuarioId) ?? null
      );
    },
    async vincular(v) {
      await alterar((d) => {
        d.vinculos = d.vinculos.filter(
          (x) =>
            x.usuarioId !== v.usuarioId &&
            x.telefone !== v.telefone &&
            (!v.lid || x.lid !== v.lid),
        );
        d.vinculos.push({ ...v, vinculadoEm: agora() });
      });
    },
    async cadastrarTelefone(usuarioId, telefone, consentidoEm) {
      return alterar((d) => {
        if (
          d.vinculos.some(
            (x) => x.telefone === telefone && x.usuarioId !== usuarioId,
          )
        )
          return "ocupado" as const;
        const atual = d.vinculos.find((x) => x.usuarioId === usuarioId);
        if (atual?.telefone === telefone) return "ok" as const;
        d.vinculos = d.vinculos.filter((x) => x.usuarioId !== usuarioId);
        d.vinculos.push({
          usuarioId,
          telefone,
          lid: null,
          jid: `${telefone}@s.whatsapp.net`,
          nomeWhatsapp: null,
          avisos: true,
          consentidoEm,
          vinculadoEm: agora(),
          confirmadoEm: null,
        });
        return "ok" as const;
      });
    },
    async confirmarVinculo(usuarioId, dados, quando) {
      await alterar((d) => {
        const v = d.vinculos.find((x) => x.usuarioId === usuarioId);
        if (!v) return;
        if (dados.lid)
          d.vinculos = d.vinculos.filter(
            (x) => x.usuarioId === usuarioId || x.lid !== dados.lid,
          );
        v.jid = dados.jid;
        v.lid = dados.lid ?? v.lid;
        v.nomeWhatsapp = dados.nomeWhatsapp ?? v.nomeWhatsapp;
        v.confirmadoEm = quando;
      });
    },
    async desvincular(usuarioId) {
      await alterar((d) => {
        d.vinculos = d.vinculos.filter((x) => x.usuarioId !== usuarioId);
        d.pendentes = d.pendentes.filter((x) => x.usuarioId !== usuarioId);
      });
    },
    async alterarAvisos(usuarioId, avisos) {
      await alterar((d) => {
        const v = d.vinculos.find((x) => x.usuarioId === usuarioId);
        if (v) v.avisos = avisos;
      });
    },

    async criarCodigo(usuarioId, codigo, expiraEm) {
      await alterar((d) => {
        d.codigos = d.codigos.filter(
          (c) => c.usuarioId !== usuarioId && c.codigo !== codigo,
        );
        d.codigos.push({ codigo, usuarioId, expiraEm });
      });
    },
    async consumirCodigo(codigo, momento) {
      return alterar((d) => {
        const c = d.codigos.find((x) => x.codigo === codigo);
        d.codigos = d.codigos.filter((x) => x.codigo !== codigo);
        return c && c.expiraEm > momento ? c.usuarioId : null;
      });
    },

    async registrarEntrada(m) {
      return alterar((d) => {
        const existente = d.mensagens.find((x) => x.messageId === m.messageId);
        if (existente)
          return {
            id: existente.id,
            novo: false,
            status: existente.status,
            criadoEm: existente.criadoEm,
          };
        const nova = {
          id: randomUUID(),
          messageId: m.messageId,
          usuarioId: m.usuarioId,
          telefone: m.telefone,
          direcao: "entrada" as const,
          tipo: m.tipo,
          texto: m.texto.slice(0, 4000),
          status: "processando" as StatusMensagem,
          respostaDe: null,
          criadoEm: agora(),
        };
        d.mensagens.push(nova);
        return {
          id: nova.id,
          novo: true,
          status: nova.status,
          criadoEm: nova.criadoEm,
        };
      });
    },
    async atualizarEntrada(id, dados) {
      await alterar((d) => {
        const m = d.mensagens.find((x) => x.id === id);
        if (!m) return;
        m.status = dados.status;
        if (dados.texto !== undefined) m.texto = dados.texto.slice(0, 4000);
        if (dados.usuarioId !== undefined) m.usuarioId = dados.usuarioId;
      });
    },
    async registrarSaidas(m) {
      await alterar((d) => {
        for (const texto of m.textos)
          d.mensagens.push({
            id: randomUUID(),
            messageId: null,
            usuarioId: m.usuarioId,
            telefone: m.telefone,
            direcao: "saida",
            tipo: "texto",
            texto: texto.slice(0, 4000),
            status: "enviada",
            respostaDe: m.respostaDe,
            criadoEm: agora(),
          });
      });
    },
    async respostasDe(entradaId) {
      return (await ler()).mensagens
        .filter((x) => x.respostaDe === entradaId)
        .map((x) => x.texto);
    },
    async historico(usuarioId, desde, limite) {
      return (await ler()).mensagens
        .filter(
          (x) => x.usuarioId === usuarioId && x.criadoEm >= desde && x.texto,
        )
        .slice(-limite)
        .map((x) => ({
          direcao: x.direcao,
          texto: x.texto,
          criadoEm: x.criadoEm,
        }));
    },

    async obterPendente(usuarioId, momento) {
      const p = (await ler()).pendentes.find((x) => x.usuarioId === usuarioId);
      return p && p.expiraEm > momento ? p.acao : null;
    },
    async salvarPendente(usuarioId, acao, expiraEm) {
      await alterar((d) => {
        d.pendentes = d.pendentes.filter((x) => x.usuarioId !== usuarioId);
        d.pendentes.push({ usuarioId, acao, expiraEm });
      });
    },
    async limparPendente(usuarioId) {
      await alterar((d) => {
        d.pendentes = d.pendentes.filter((x) => x.usuarioId !== usuarioId);
      });
    },

    async obterCanal() {
      return (await ler()).canal;
    },
    async informarCanal(e) {
      return alterar((d) => {
        const comando = d.canal?.comando ?? null;
        d.canal = { ...e, comando: null, atualizadoEm: agora() };
        return comando;
      });
    },
    async pedirComando(comando) {
      await alterar((d) => {
        d.canal = {
          ...(d.canal ?? {
            status: "desconhecido",
            qr: null,
            numero: null,
            nome: null,
          }),
          comando,
          atualizadoEm: d.canal?.atualizadoEm ?? agora(),
        };
      });
    },

    async obterConfig() {
      return (await ler()).config ?? dadosVazios().config;
    },
    async salvarConfig(c) {
      await alterar((d) => {
        d.config = c;
      });
    },
    async resumoAdmin(desde) {
      const d = await ler();
      return {
        ligados: d.vinculos.filter((v) => v.confirmadoEm).length,
        aguardando: d.vinculos.filter((v) => !v.confirmadoEm).length,
        mensagensHoje: d.mensagens.filter(
          (m) => m.direcao === "entrada" && m.criadoEm >= desde,
        ).length,
        clientes: [...d.vinculos]
          .sort((a, b) => b.vinculadoEm.localeCompare(a.vinculadoEm))
          .slice(0, 50)
          .map((v) => ({
            usuarioId: v.usuarioId,
            nome: v.nomeWhatsapp,
            telefone: v.telefone,
            vinculadoEm: v.vinculadoEm,
            confirmado: Boolean(v.confirmadoEm),
          })),
      };
    },

    async limpar() {
      await alterar((d) => {
        const limite = new Date(
          relogio().getTime() - NOVENTA_DIAS,
        ).toISOString();
        const momento = agora();
        d.mensagens = d.mensagens.filter((x) => x.criadoEm >= limite);
        d.codigos = d.codigos.filter((x) => x.expiraEm > momento);
        d.pendentes = d.pendentes.filter((x) => x.expiraEm > momento);
      });
    },
  };
}

export function armazemEmMemoria(relogio?: () => Date) {
  let dados = dadosVazios();
  return {
    armazem: armazemSobre(
      async () => dados,
      async (d) => {
        dados = d;
      },
      relogio,
    ),
    dados: () => dados,
  };
}
