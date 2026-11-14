import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_TESTE, sessaoTesteValida } from "@/lib/modo-teste";

const ROTAS_PROTEGIDAS = ["/inicio", "/perfil", "/mercado", "/carteira", "/aprender", "/conta", "/entrevista", "/simulador", "/financas", "/radar"];
const ROTAS_SO_VISITANTE = ["/", "/cadastro"];

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const caminho = request.nextUrl.pathname;
  const protegida = ROTAS_PROTEGIDAS.some((r) => caminho.startsWith(r));

  // Modo de teste local (só em desenvolvimento).
  if (sessaoTesteValida(request.cookies.get(COOKIE_TESTE)?.value)) {
    if (ROTAS_SO_VISITANTE.includes(caminho)) {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }
    return resposta;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    // Sem Supabase configurado: ninguém está logado.
    return protegida ? NextResponse.redirect(new URL("/", request.url)) : resposta;
  }

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (protegida && (!user || !user.email_confirmed_at)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (user?.email_confirmed_at && ROTAS_SO_VISITANTE.includes(caminho)) {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  return resposta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|pwa-icon|api/).*)",
  ],
};
