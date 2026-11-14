"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { dentroDoLimite, registrarErro } from "@/lib/servidor/util";
import { armazemWhatsApp } from "@/lib/servidor/whatsapp/armazem";
import { ehOperadorWhatsApp } from "@/lib/servidor/whatsapp/operacao";

// Ações da tela Conta › WhatsApp: gerar o código de vínculo, conferir se o número
// já ligou, desligar e (para quem opera o canal) desconectar o número do Findomo.

const VALIDADE_CODIGO_MS = 15 * 60 * 1000;

export async function gerarCodigoWhatsApp(consentiu: boolean) {
  if (!consentiu) return { erro: "Marque a autorização para continuar." };
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`wa-codigo:${uid}`, 8, 60 * 60 * 1000))
    return { erro: "Muitos códigos em pouco tempo. Tente de novo mais tarde." };
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MS).toISOString();
  const armazem = armazemWhatsApp();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
    try {
      await armazem.criarCodigo(uid, codigo, expiraEm);
      return { codigo, expiraEm };
    } catch (e) {
      if (!(e instanceof Error && e.message === "codigo_repetido")) {
        registrarErro(
          "whatsapp gerar código",
          e instanceof Error ? e.message.slice(0, 60) : undefined,
        );
        return {
          erro: "Não foi possível gerar o código agora. Tente de novo.",
        };
      }
    }
  }
  return { erro: "Não foi possível gerar o código agora. Tente de novo." };
}

export async function whatsAppVinculado() {
  const { uid } = await exigirUsuario();
  return Boolean(await armazemWhatsApp().vinculoDoUsuario(uid));
}

export async function desligarWhatsApp() {
  const { uid } = await exigirUsuario();
  try {
    await armazemWhatsApp().desvincular(uid);
  } catch (e) {
    registrarErro(
      "whatsapp desligar",
      e instanceof Error ? e.message.slice(0, 60) : undefined,
    );
    return { erro: "Não foi possível desligar agora. Tente de novo." };
  }
  revalidatePath("/conta/whatsapp");
  return { ok: true };
}

export async function desconectarCanalWhatsApp() {
  const { email, teste } = await exigirUsuario();
  if (!ehOperadorWhatsApp(email, teste)) return { erro: "Sem permissão." };
  await armazemWhatsApp().pedirComando("desconectar");
  revalidatePath("/conta/whatsapp");
  return { ok: true };
}
