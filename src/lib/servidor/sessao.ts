import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { COOKIE_TESTE, USUARIO_TESTE, sessaoTesteValida } from "@/lib/modo-teste";
import { repositorio } from "./repositorio";

export async function emSessaoTeste() {
  return sessaoTesteValida((await cookies()).get(COOKIE_TESTE)?.value);
}

// Usuário logado e com e-mail confirmado, ou volta para o login.
// Devolve o uid e o repositório certo (arquivo no modo de teste, Supabase no real).
export async function exigirUsuario() {
  if (await emSessaoTeste()) {
    return {
      uid: USUARIO_TESTE.id,
      usuario: USUARIO_TESTE,
      email: USUARIO_TESTE.email,
      primeiroNome: "Admin",
      teste: true,
      repo: repositorio(true),
    };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email_confirmed_at) redirect("/");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, nome_completo, email, plano, criado_em")
    .eq("id", user.id)
    .single();

  return {
    uid: user.id,
    usuario,
    email: user.email ?? "",
    primeiroNome: (usuario?.nome_completo ?? "").split(/\s+/)[0] || "",
    teste: false,
    repo: repositorio(false),
  };
}
