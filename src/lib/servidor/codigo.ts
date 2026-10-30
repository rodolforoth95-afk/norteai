import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteAdmin } from "@/lib/supabase/servidor";
import { REENVIO_INTERVALO_MS, hashEmail, registrarErro } from "./util";

// Reinicia o contador de tentativas quando um novo código é enviado.
export async function registrarEnvioCodigo(email: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("verificacao_email")
    .upsert({ email_hash: hashEmail(email), tentativas: 0, enviado_em: new Date().toISOString() });
  if (error) registrarErro("registrar envio do código", error.code);
}

// Segundos que faltam para liberar um novo envio (0 = pode enviar).
export async function segundosParaReenvio(email: string) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("verificacao_email")
    .select("enviado_em")
    .eq("email_hash", hashEmail(email))
    .maybeSingle();
  if (!data) return 0;
  const restante = new Date(data.enviado_em).getTime() + REENVIO_INTERVALO_MS - Date.now();
  return Math.max(0, Math.ceil(restante / 1000));
}

// Reenvia o código de confirmação de cadastro, respeitando o intervalo de 60 s.
export async function reenviarCodigo(supabase: SupabaseClient, email: string) {
  const espera = await segundosParaReenvio(email);
  if (espera > 0) return { ok: false as const, espera };
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    registrarErro("reenviar código", error.code);
    return { ok: false as const, espera: 0, falhou: true };
  }
  await registrarEnvioCodigo(email);
  return { ok: true as const, espera: 60 };
}
