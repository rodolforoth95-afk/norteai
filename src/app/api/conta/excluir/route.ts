import { NextResponse } from "next/server";
import { z } from "zod";
import { criarClienteAdmin, criarClienteServidor } from "@/lib/supabase/servidor";
import { erro, registrarErro } from "@/lib/servidor/util";
import { emSessaoTeste } from "@/lib/servidor/sessao";

const Corpo = z.object({ confirmacao: z.literal("EXCLUIR") });

// "Excluir minha conta": apaga o usuário do Auth; as tabelas ligadas
// a ele são apagadas em cascata (on delete cascade). A exclusão é imediata,
// dentro do prazo de 15 dias prometido ao usuário.
export async function POST(req: Request) {
  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Digite EXCLUIR para confirmar.", 400);
  if (await emSessaoTeste()) {
    return erro("No modo de teste não há conta para excluir. Configure o Supabase.", 400);
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return erro("Entre na sua conta para continuar.", 401);

  const { error } = await criarClienteAdmin().auth.admin.deleteUser(user.id);
  if (error) {
    registrarErro("excluir conta", error.code);
    return erro("Não foi possível excluir a conta agora. Tente de novo.", 500);
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
