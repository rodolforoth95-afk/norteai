import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { exigirUsuario } from "@/lib/servidor/sessao";

// "Baixar meus dados" (LGPD): tudo o que guardamos sobre o usuário, em JSON.
export async function GET() {
  const { uid, repo, usuario, teste } = await exigirUsuario();

  const consentimentos = teste
    ? []
    : ((await (await criarClienteServidor()).from("consentimento").select("documento, versao, aceito_em").order("aceito_em")).data ?? []);

  const [entrevista, perfil, carteira, coins, concluidos] = await Promise.all([
    repo.obterEntrevista(uid),
    repo.obterPerfil(uid),
    repo.obterCarteira(uid),
    repo.listarMoedas(uid),
    repo.listarConcluidos(uid),
  ]);

  const corpo = {
    gerado_em: new Date().toISOString(),
    usuario,
    consentimentos,
    entrevista,
    perfil,
    carteira,
    coins,
    conteudos_concluidos: concluidos,
  };

  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="findomo-meus-dados.json"',
      "Cache-Control": "no-store",
    },
  });
}
