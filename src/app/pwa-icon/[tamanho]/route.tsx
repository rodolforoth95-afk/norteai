import { iconeApp } from "@/lib/icone-app";

const TAMANHOS = new Set([192, 512]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tamanho: string }> },
) {
  const tamanho = Number((await params).tamanho);
  if (!TAMANHOS.has(tamanho)) {
    return new Response("Não encontrado", { status: 404 });
  }
  return iconeApp(tamanho);
}
