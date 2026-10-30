import "server-only";
import { createHmac } from "node:crypto";
import { criarClienteAdmin, criarClienteServidor } from "@/lib/supabase/servidor";
import { VERSOES_DOCUMENTOS, registrarErro } from "./util";

// Login de demonstração "admin/admin" na versão publicada, para testes com colegas.
// Só funciona com ADMIN_ATIVO=1 nas variáveis de ambiente (desligado por padrão).
// O Supabase não aceita senha tão curta, então o servidor entra numa conta interna
// cuja senha forte é derivada da chave secreta do Supabase e nunca sai do servidor.

const EMAIL_INTERNO = process.env.ADMIN_EMAIL ?? "admin@example.com";

export function adminWebAtivo() {
  return (
    process.env.ADMIN_ATIVO === "1" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function ehLoginAdminWeb(email: unknown, senha: unknown) {
  return (
    adminWebAtivo() &&
    typeof email === "string" &&
    email.trim().toLowerCase() === (process.env.ADMIN_USUARIO ?? "admin") &&
    senha === (process.env.ADMIN_SENHA ?? "admin")
  );
}

function senhaInterna() {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("norteia-admin-web").digest("base64url");
}

// Garante que a conta interna existe com a senha atual (cria no primeiro uso).
async function prepararConta() {
  const admin = criarClienteAdmin();
  const criada = await admin.auth.admin.createUser({
    email: EMAIL_INTERNO,
    password: senhaInterna(),
    email_confirm: true,
    user_metadata: { nome_completo: "Admin Norte.ia" },
  });

  if (criada.data.user) {
    const aceitoEm = new Date().toISOString();
    await admin.from("consentimento").insert(
      (Object.keys(VERSOES_DOCUMENTOS) as (keyof typeof VERSOES_DOCUMENTOS)[]).map((documento) => ({
        usuario_id: criada.data.user!.id,
        documento,
        versao: VERSOES_DOCUMENTOS[documento],
        aceito_em: aceitoEm,
      })),
    );
    return;
  }

  // Já existe (ex.: a chave secreta mudou): realinha a senha interna.
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existente = data?.users.find((u) => u.email?.toLowerCase() === EMAIL_INTERNO);
  if (!existente) throw new Error("conta admin indisponível");
  await admin.auth.admin.updateUserById(existente.id, { password: senhaInterna(), email_confirm: true });
}

// Entra na conta interna e grava a sessão nos cookies. Devolve o id do usuário.
export async function entrarComoAdmin(): Promise<string | null> {
  const supabase = await criarClienteServidor();
  let r = await supabase.auth.signInWithPassword({ email: EMAIL_INTERNO, password: senhaInterna() });
  if (r.error) {
    try {
      await prepararConta();
    } catch (e) {
      registrarErro("preparar conta admin", e instanceof Error ? e.message : undefined);
      return null;
    }
    r = await supabase.auth.signInWithPassword({ email: EMAIL_INTERNO, password: senhaInterna() });
  }
  if (r.error || !r.data.user) {
    registrarErro("login admin web", r.error?.code);
    return null;
  }
  return r.data.user.id;
}
