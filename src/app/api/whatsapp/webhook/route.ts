import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  assinaturaValida,
  chaveInterna,
} from "@/lib/servidor/whatsapp/assinatura";
import { dependenciasReais } from "@/lib/servidor/whatsapp/dependencias";
import { processarMensagem } from "@/lib/servidor/whatsapp/mordomo";
import { erro, registrarErro } from "@/lib/servidor/util";

// Porta de entrada das mensagens do WhatsApp. Só o canal (serviço Baileys) chama, com
// assinatura HMAC. A resposta leva os textos que o canal envia ao cliente.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TAMANHO_MAXIMO = 6 * 1024 * 1024;

const Mensagem = z.object({
  messageId: z.string().min(1).max(128),
  telefone: z.string().regex(/^\d{10,15}$/),
  jid: z.string().min(5).max(128),
  lid: z.string().max(128).nullable(),
  nome: z.string().max(120).default(""),
  texto: z.string().max(4000).default(""),
  midia: z
    .object({
      tipo: z.enum(["imagem", "audio", "documento"]),
      mimetype: z.string().max(100),
      base64: z.string().max(TAMANHO_MAXIMO),
    })
    .nullable()
    .default(null),
});

export async function POST(req: Request) {
  const chave = chaveInterna();
  if (!chave) {
    registrarErro("whatsapp sem WHATSAPP_CHAVE_INTERNA");
    return erro("Canal não configurado.", 503);
  }
  if (Number(req.headers.get("content-length") ?? 0) > TAMANHO_MAXIMO)
    return erro("Mensagem grande demais.", 413);
  const corpo = await req.text();
  const valida = assinaturaValida({
    chave,
    timestamp: req.headers.get("x-findomo-timestamp"),
    assinatura: req.headers.get("x-findomo-assinatura"),
    corpo,
  });
  if (!valida) return erro("Não autorizado.", 401);

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return erro("Corpo inválido.", 400);
  }
  const lido = Mensagem.safeParse(json);
  if (!lido.success) return erro("Mensagem inválida.", 400);

  const deps = dependenciasReais();
  const resultado = await processarMensagem(lido.data, deps);
  if (resultado.usuarioId && !resultado.repetida) revalidatePath("/", "layout");
  if (Math.random() < 0.02)
    deps.armazem.limpar().catch(() => registrarErro("whatsapp limpeza"));
  return NextResponse.json({ respostas: resultado.respostas });
}
