import { NextResponse } from "next/server";
import { z } from "zod";
import { armazemWhatsApp } from "@/lib/servidor/whatsapp/armazem";
import {
  assinaturaValida,
  chaveInterna,
} from "@/lib/servidor/whatsapp/assinatura";
import { erro } from "@/lib/servidor/util";

// O canal informa o próprio estado (conectado, QR para parear) a cada mudança e a cada
// 30 s. A resposta leva um comando pendente (ex.: desconectar), assim o canal nunca
// precisa ficar exposto na internet.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Estado = z.object({
  status: z.enum([
    "iniciando",
    "qr",
    "conectando",
    "conectado",
    "desconectado",
  ]),
  qr: z.string().max(20_000).nullable(),
  numero: z.string().max(20).nullable(),
  nome: z.string().max(120).nullable(),
});

export async function POST(req: Request) {
  const corpo = await req.text();
  const valida = assinaturaValida({
    chave: chaveInterna(),
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
  const lido = Estado.safeParse(json);
  if (!lido.success) return erro("Estado inválido.", 400);
  const comando = await armazemWhatsApp().informarCanal(lido.data);
  return NextResponse.json({ comando });
}
