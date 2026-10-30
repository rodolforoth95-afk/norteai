import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// Versões vigentes dos documentos aceitos no cadastro.
export const VERSOES_DOCUMENTOS = {
  termos: "2026-10-30",
  privacidade: "2026-10-30",
  maioridade: "2026-10-30",
} as const;

export const CODIGO_VALIDADE_MS = 10 * 60 * 1000;
export const CODIGO_MAX_TENTATIVAS = 5;
export const REENVIO_INTERVALO_MS = 60 * 1000;

export function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function erro(mensagem: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ erro: mensagem, ...extra }, { status });
}

// Limite de requisições simples, em memória (por instância do servidor).
// Na Etapa 6, trocar por um armazenamento compartilhado (ex.: Upstash Redis ou tabela no banco).
const baldes = new Map<string, { contagem: number; reiniciaEm: number }>();

export function dentroDoLimite(chave: string, maximo: number, janelaMs: number) {
  const agora = Date.now();
  const balde = baldes.get(chave);
  if (!balde || balde.reiniciaEm < agora) {
    baldes.set(chave, { contagem: 1, reiniciaEm: agora + janelaMs });
    return true;
  }
  balde.contagem += 1;
  return balde.contagem <= maximo;
}

export function ipDe(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

// Logs sem dados pessoais: só o evento e um código de erro.
export function registrarErro(evento: string, codigo?: string) {
  console.error(`[norteia] ${evento}${codigo ? ` (${codigo})` : ""}`);
}
