import { NextResponse } from "next/server";
import { z } from "zod";
import { esquemaEmail } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { reenviarCodigo } from "@/lib/servidor/codigo";
import { destinoPosLogin } from "@/lib/servidor/destino";
import { COOKIE_TESTE, USUARIO_TESTE, ehLoginTeste } from "@/lib/modo-teste";
import { ehLoginAdminWeb, entrarComoAdmin } from "@/lib/servidor/admin-web";
import { repositorio } from "@/lib/servidor/repositorio";
import { BONUS_DEMO } from "@/lib/dominio/moedas";
import { dentroDoLimite, erro, hashEmail, ipDe, registrarErro } from "@/lib/servidor/util";

const Corpo = z.object({ email: esquemaEmail, senha: z.string().min(1, "Informe sua senha.") });

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);

  if (ehLoginTeste(corpo?.email, corpo?.senha)) {
    await darBonusDemo(USUARIO_TESTE.id, true);
    const resposta = NextResponse.json({
      ok: true,
      destino: await destinoPosLogin(USUARIO_TESTE.id, true),
    });
    resposta.cookies.set(COOKIE_TESTE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
    return resposta;
  }

  // Login de demonstração na versão publicada (só com ADMIN_ATIVO=1).
  if (ehLoginAdminWeb(corpo?.email, corpo?.senha)) {
    if (!dentroDoLimite(`entrar:admin:${ipDe(req)}`, 20, 15 * 60 * 1000)) {
      return erro("Muitas tentativas de login. Tente de novo em 15 minutos.", 429);
    }
    const uid = await entrarComoAdmin();
    if (!uid) return erro("Não foi possível entrar com o usuário de demonstração agora.", 500);
    await darBonusDemo(uid, false);
    return NextResponse.json({ ok: true, destino: await destinoPosLogin(uid) });
  }

  const lido = Corpo.safeParse(corpo);
  if (!lido.success) return erro(lido.error.issues[0]?.message ?? "Dados inválidos.", 400);
  const { email, senha } = lido.data;

  const janela = 15 * 60 * 1000;
  if (
    !dentroDoLimite(`entrar:ip:${ipDe(req)}`, 20, janela) ||
    !dentroDoLimite(`entrar:email:${hashEmail(email)}`, 8, janela)
  ) {
    return erro("Muitas tentativas de login. Tente de novo em 15 minutos.", 429);
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    if (error.code === "email_not_confirmed") {
      await reenviarCodigo(supabase, email);
      return NextResponse.json({ ok: false, verificar: true });
    }
    if (error.code === "invalid_credentials") return erro("E-mail ou senha incorretos.", 401);
    registrarErro("login", error.code);
    return erro("Não foi possível entrar agora. Tente de novo.", 500);
  }

  return NextResponse.json({ ok: true, destino: await destinoPosLogin(data.user.id) });
}

// Lança uma única vez (o lançamento é único por tipo + referência).
async function darBonusDemo(uid: string, teste: boolean) {
  try {
    await repositorio(teste).lancarMoedas(uid, BONUS_DEMO.tipo, BONUS_DEMO.referencia, BONUS_DEMO.valor);
  } catch (e) {
    registrarErro("bônus da conta de demonstração", e instanceof Error ? e.message : undefined);
  }
}
