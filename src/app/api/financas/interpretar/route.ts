import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel, lerLancamentoComIA } from "@/lib/servidor/ia";
import { contextoIA, previaDaIA, previaLocal } from "@/lib/servidor/leitura-financas";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const Corpo = z.object({ frase: z.string().trim().min(2).max(500) });

// Frase falada ou digitada → prévia do lançamento. Com a IA ligada usa o Claude; sem ela,
// a leitura local em português resolve os casos comuns ("gastei 85 no almoço no débito").
export async function POST(req: Request) {
  const { uid, repo } = await exigirUsuario();
  if (!dentroDoLimite(`fin-frase:${uid}`, 120, 60 * 60 * 1000)) return erro("Muitas leituras em pouco tempo. Tente mais tarde.", 429);
  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Diga ou digite o lançamento.", 400);
  const dados = await carregarFinancas(repo, uid);

  if (iaDisponivel()) {
    try {
      const r = await lerLancamentoComIA({ texto: lido.data.frase }, contextoIA(dados));
      if (r && r.valor) return NextResponse.json(previaDaIA(r, dados));
    } catch (e) {
      registrarErro("frase ia", e instanceof Error ? e.name : undefined);
    }
  }
  return NextResponse.json(previaLocal(lido.data.frase, dados));
}
