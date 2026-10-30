import { createBrowserClient } from "@supabase/ssr";

// Cliente do navegador: usa só a chave pública (anon). Nunca a service role.
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
