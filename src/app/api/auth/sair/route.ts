import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { COOKIE_TESTE } from "@/lib/modo-teste";

export async function POST() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await criarClienteServidor();
    await supabase.auth.signOut();
  }
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete(COOKIE_TESTE);
  return resposta;
}
