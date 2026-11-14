import { NextResponse } from "next/server";
import { z } from "zod";
import { hojeBR } from "@/lib/dominio/carteira";
import { mesDe } from "@/lib/dominio/financas";
import { contextoFinancas, responderLocal } from "@/lib/dominio/assistente-financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { aportesPorMes, carregarFinancas } from "@/lib/servidor/financas";
import { conversarFinancas, iaDisponivel } from "@/lib/servidor/ia";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const Corpo = z.object({
  mensagens: z.array(z.object({ papel: z.enum(["usuario", "assistente"]), texto: z.string().trim().min(1).max(1500) })).min(1).max(20),
});

// Chat de finanças: responde com base nos lançamentos da própria pessoa.
export async function POST(req: Request) {
  const { uid, repo } = await exigirUsuario();
  if (!dentroDoLimite(`fin-chat:${uid}`, 60, 60 * 60 * 1000)) return erro("Muitas perguntas em pouco tempo. Tente de novo mais tarde.", 429);
  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Mensagem inválida.", 400);
  const [dados, aportes] = await Promise.all([carregarFinancas(repo, uid), aportesPorMes(repo, uid)]);
  const mes = mesDe(hojeBR());
  const ultima = lido.data.mensagens.at(-1)!;

  if (iaDisponivel() && dados.lancamentos.length) {
    try {
      const texto = await conversarFinancas(contextoFinancas(dados, mes, aportes), lido.data.mensagens);
      if (texto) return NextResponse.json({ texto, viaIA: true });
    } catch (e) {
      registrarErro("chat financas", e instanceof Error ? e.name : undefined);
    }
  }
  return NextResponse.json({ texto: responderLocal(ultima.texto, dados, mes, aportes), viaIA: false });
}
