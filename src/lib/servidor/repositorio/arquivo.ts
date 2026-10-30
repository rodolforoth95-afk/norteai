import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Carteira, EstadoEntrevista, LancamentoMoedas, Perfil, Snapshot } from "@/lib/dominio/tipos";
import type { Repositorio } from "./tipo";

// Armazenamento em arquivo JSON, só para o modo de teste local.
type DadosUsuario = {
  entrevista: EstadoEntrevista | null;
  perfis: Perfil[];
  carteira: Carteira | null;
  snapshots: Snapshot[];
  moedas: LancamentoMoedas[];
  concluidos: string[];
  auditoria?: { tipo: string; criado_em: string }[];
};

const ARQUIVO = path.join(process.cwd(), ".dados", "teste.json");

async function ler(): Promise<Record<string, DadosUsuario>> {
  try {
    return JSON.parse(await readFile(ARQUIVO, "utf8"));
  } catch {
    return {};
  }
}

async function alterar<T>(uid: string, fn: (d: DadosUsuario) => T): Promise<T> {
  const tudo = await ler();
  const dados = (tudo[uid] ??= {
    entrevista: null,
    perfis: [],
    carteira: null,
    snapshots: [],
    moedas: [],
    concluidos: [],
  });
  const resultado = fn(dados);
  await mkdir(path.dirname(ARQUIVO), { recursive: true });
  await writeFile(ARQUIVO, JSON.stringify(tudo, null, 2));
  return resultado;
}

async function de(uid: string) {
  return (await ler())[uid];
}

export const repositorioArquivo: Repositorio = {
  async obterEntrevista(uid) {
    return (await de(uid))?.entrevista ?? null;
  },
  async salvarEntrevista(uid, estado) {
    await alterar(uid, (d) => void (d.entrevista = estado));
  },

  async obterPerfil(uid) {
    const perfis = (await de(uid))?.perfis ?? [];
    return perfis[perfis.length - 1] ?? null;
  },
  async salvarPerfil(uid, novo) {
    return alterar(uid, (d) => {
      const perfil: Perfil = { ...novo, versao: d.perfis.length + 1, criado_em: new Date().toISOString() };
      d.perfis.push(perfil);
      return perfil;
    });
  },

  async obterCarteira(uid) {
    return (await de(uid))?.carteira ?? null;
  },
  async salvarCarteira(uid, origem, posicoes) {
    return alterar(uid, (d) => {
      d.carteira = { origem, posicoes, atualizada_em: new Date().toISOString() };
      return d.carteira;
    });
  },

  async listarSnapshots(uid) {
    return (await de(uid))?.snapshots ?? [];
  },
  async adicionarSnapshot(uid, snapshot) {
    await alterar(uid, (d) => void d.snapshots.push(snapshot));
  },

  async listarMoedas(uid) {
    return (await de(uid))?.moedas ?? [];
  },
  async lancarMoedas(uid, tipo, referencia, valor) {
    return alterar(uid, (d) => {
      if (d.moedas.some((m) => m.tipo === tipo && m.referencia === referencia)) return false;
      d.moedas.push({ tipo, referencia, valor, criado_em: new Date().toISOString() });
      return true;
    });
  },

  async listarConcluidos(uid) {
    return (await de(uid))?.concluidos ?? [];
  },
  async marcarConcluido(uid, chave) {
    await alterar(uid, (d) => {
      if (!d.concluidos.includes(chave)) d.concluidos.push(chave);
    });
  },

  async registrarAuditoriaIA(uid, tipo) {
    await alterar(uid, (d) => void (d.auditoria ??= []).push({ tipo, criado_em: new Date().toISOString() }));
  },
};

// Usado para gerar a carteira de exemplo do modo de teste (snapshots com datas passadas).
export async function substituirSnapshotsTeste(uid: string, snapshots: Snapshot[]) {
  await alterar(uid, (d) => void (d.snapshots = snapshots));
}
