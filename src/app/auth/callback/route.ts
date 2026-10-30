import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Recebe o link de redefinição de senha enviado por e-mail.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("code");
  const proximo = url.searchParams.get("next") ?? "/inicio";
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/inicio";

  if (codigo) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  return NextResponse.redirect(new URL("/esqueci-senha?link=invalido", url.origin));
}
