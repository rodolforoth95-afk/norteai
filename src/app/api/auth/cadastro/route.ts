import { NextResponse } from "next/server";
import { z } from "zod";
import { esquemaEmail, esquemaNome, esquemaSenha } from "@/lib/validacao";
import { criarClienteAdmin, criarClienteServidor } from "@/lib/supabase/servidor";
import { registrarEnvioCodigo } from "@/lib/servidor/codigo";
import {
  VERSOES_DOCUMENTOS,
  dentroDoLimite,
  erro,
  ipDe,
  registrarErro,
} from "@/lib/servidor/util";

const Corpo = z.object({
  nome: esquemaNome,
  email: esquemaEmail,
  senha: esquemaSenha,
  maioridade: z.literal(true, "Confirme que você tem 18 anos ou mais."),
  termos: z.literal(true, "Aceite os Termos de uso e a Política de privacidade."),
});

export async function POST(req: Request) {
  if (!dentroDoLimite(`cadastro:${ipDe(req)}`, 5, 15 * 60 * 1000)) {
    return erro("Muitas tentativas. Tente de novo em alguns minutos.", 429);
  }

  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro(lido.error.issues[0]?.message ?? "Dados inválidos.", 400);
  const { nome, email, senha } = lido.data;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome_completo: nome } },
  });

  if (error) {
    if (error.code === "weak_password") return erro("Essa senha é fraca. " + error.message, 400);
    if (error.code === "user_already_exists") return erro("Este e-mail já está cadastrado.", 409);
    registrarErro("cadastro", error.code);
    return erro("Não foi possível criar a conta agora. Tente de novo.", 500);
  }

  // O Supabase não acusa e-mail repetido (proteção contra enumeração):
  // devolve um usuário sem identidades quando o e-mail já existe.
  if (!data.user || data.user.identities?.length === 0) {
    return erro("Este e-mail já está cadastrado. Entre ou recupere sua senha.", 409);
  }

  const admin = criarClienteAdmin();
  const aceitoEm = new Date().toISOString();
  const { error: erroConsentimento } = await admin.from("consentimento").insert(
    (Object.keys(VERSOES_DOCUMENTOS) as (keyof typeof VERSOES_DOCUMENTOS)[]).map((documento) => ({
      usuario_id: data.user!.id,
      documento,
      versao: VERSOES_DOCUMENTOS[documento],
      aceito_em: aceitoEm,
    })),
  );
  if (erroConsentimento) {
    // Sem registro de aceite, a conta não pode existir.
    registrarErro("gravar consentimento", erroConsentimento.code);
    await admin.auth.admin.deleteUser(data.user.id);
    return erro("Não foi possível criar a conta agora. Tente de novo.", 500);
  }

  await registrarEnvioCodigo(email);
  return NextResponse.json({ ok: true });
}
