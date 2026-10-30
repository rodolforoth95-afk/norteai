import { NextResponse } from "next/server";
import { z } from "zod";
import { esquemaCodigo, esquemaEmail } from "@/lib/validacao";
import { criarClienteAdmin, criarClienteServidor } from "@/lib/supabase/servidor";
import {
  CODIGO_MAX_TENTATIVAS,
  CODIGO_VALIDADE_MS,
  dentroDoLimite,
  erro,
  hashEmail,
  ipDe,
} from "@/lib/servidor/util";
import { destinoPosLogin } from "@/lib/servidor/destino";

const Corpo = z.object({ email: esquemaEmail, codigo: esquemaCodigo });

export async function POST(req: Request) {
  if (!dentroDoLimite(`verificar:${ipDe(req)}`, 20, 15 * 60 * 1000)) {
    return erro("Muitas tentativas. Tente de novo em alguns minutos.", 429);
  }

  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro(lido.error.issues[0]?.message ?? "Dados inválidos.", 400);
  const { email, codigo } = lido.data;

  const admin = criarClienteAdmin();
  const emailHash = hashEmail(email);
  const { data: registro } = await admin
    .from("verificacao_email")
    .select("tentativas, enviado_em")
    .eq("email_hash", emailHash)
    .maybeSingle();

  if (!registro) return erro("Peça um novo código para continuar.", 410, { novoCodigo: true });
  if (registro.tentativas >= CODIGO_MAX_TENTATIVAS) {
    return erro("Você usou as 5 tentativas. Peça um novo código.", 429, { novoCodigo: true });
  }
  if (Date.now() - new Date(registro.enviado_em).getTime() > CODIGO_VALIDADE_MS) {
    return erro("Este código expirou. Peça um novo código.", 410, { novoCodigo: true });
  }

  const tentativas = registro.tentativas + 1;
  await admin.from("verificacao_email").update({ tentativas }).eq("email_hash", emailHash);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });

  if (error || !data.user) {
    const restantes = CODIGO_MAX_TENTATIVAS - tentativas;
    if (restantes <= 0) {
      return erro("Código incorreto. Você usou as 5 tentativas. Peça um novo código.", 400, {
        novoCodigo: true,
      });
    }
    return erro(
      `Código incorreto. ${restantes === 1 ? "Resta 1 tentativa" : `Restam ${restantes} tentativas`}.`,
      400,
    );
  }

  await admin.from("verificacao_email").delete().eq("email_hash", emailHash);
  return NextResponse.json({ ok: true, destino: await destinoPosLogin(data.user.id) });
}
