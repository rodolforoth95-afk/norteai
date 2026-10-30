import { NextResponse } from "next/server";
import { z } from "zod";
import { esquemaEmail } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { reenviarCodigo } from "@/lib/servidor/codigo";
import { dentroDoLimite, erro, ipDe } from "@/lib/servidor/util";

const Corpo = z.object({ email: esquemaEmail });

export async function POST(req: Request) {
  if (!dentroDoLimite(`reenviar:${ipDe(req)}`, 5, 15 * 60 * 1000)) {
    return erro("Muitos envios. Tente de novo em alguns minutos.", 429);
  }

  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Informe um e-mail válido.", 400);

  const supabase = await criarClienteServidor();
  const r = await reenviarCodigo(supabase, lido.data.email);
  if (r.ok) return NextResponse.json({ ok: true, espera: r.espera });
  if (r.espera > 0) {
    return erro(`Aguarde ${r.espera} segundos para pedir outro código.`, 429, { espera: r.espera });
  }
  return erro("Não foi possível reenviar o código agora. Tente de novo.", 500);
}
