// Modo de teste local: permite entrar com um login fixo, sem Supabase e sem e-mail real.
// Só vale com `npm run dev` e MODO_TESTE=1 no .env.local. Em produção fica sempre desligado.

export const COOKIE_TESTE = "norteia_teste";

const LOGIN_TESTE = { email: "admin", senha: "admin" };

export const USUARIO_TESTE = {
  id: "00000000-0000-0000-0000-000000000000",
  nome_completo: "Admin Teste",
  email: "admin",
  plano: "gratuito",
  criado_em: "2026-10-30T00:00:00.000Z",
};

export function modoTesteAtivo() {
  return process.env.NODE_ENV !== "production" && process.env.MODO_TESTE === "1";
}

export function ehLoginTeste(email: unknown, senha: unknown) {
  return (
    modoTesteAtivo() &&
    typeof email === "string" &&
    email.trim().toLowerCase() === LOGIN_TESTE.email &&
    senha === LOGIN_TESTE.senha
  );
}

export function sessaoTesteValida(valorCookie: string | undefined) {
  return modoTesteAtivo() && valorCookie === "1";
}
