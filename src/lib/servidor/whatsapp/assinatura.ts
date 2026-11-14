import { createHmac, timingSafeEqual } from "node:crypto";

// Autenticação entre o canal (serviço Baileys) e o Findomo: cada requisição leva
// x-findomo-timestamp e x-findomo-assinatura = HMAC-SHA256(chave, "timestamp.corpo").
// A chave vem de WHATSAPP_CHAVE_INTERNA (a mesma nos dois lados) e nunca tem valor padrão.

export const JANELA_ASSINATURA_MS = 5 * 60 * 1000;

export function chaveInterna() {
  const chave = process.env.WHATSAPP_CHAVE_INTERNA ?? "";
  return chave.length >= 32 ? chave : null;
}

export function assinar(chave: string, timestamp: string, corpo: string) {
  return createHmac("sha256", chave)
    .update(`${timestamp}.${corpo}`)
    .digest("hex");
}

export function assinaturaValida(params: {
  chave: string | null;
  timestamp: string | null;
  assinatura: string | null;
  corpo: string;
  agora?: number;
}) {
  const { chave, timestamp, assinatura, corpo } = params;
  if (!chave || !timestamp || !assinatura || !/^\d{10,16}$/.test(timestamp))
    return false;
  if (
    Math.abs((params.agora ?? Date.now()) - Number(timestamp)) >
    JANELA_ASSINATURA_MS
  )
    return false;
  const esperada = Buffer.from(assinar(chave, timestamp, corpo), "hex");
  const recebida = Buffer.from(assinatura, "hex");
  return (
    recebida.length === esperada.length && timingSafeEqual(recebida, esperada)
  );
}
