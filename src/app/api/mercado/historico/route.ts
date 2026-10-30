import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { PERIODOS, historico, type Periodo } from "@/lib/servidor/brapi";
import { dentroDoLimite, erro } from "@/lib/servidor/util";

export async function GET(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`historico:${uid}`, 120, 60 * 60 * 1000)) return erro("Muitas consultas. Tente em alguns minutos.", 429);
  const url = new URL(req.url);
  const simbolo = url.searchParams.get("simbolo")?.toUpperCase() ?? "";
  const periodo = url.searchParams.get("periodo") as Periodo;
  if (!/^\^?[A-Z0-9]{3,12}$/.test(simbolo) || !PERIODOS.includes(periodo)) return erro("Parâmetros inválidos.", 400);
  try {
    return NextResponse.json({ pontos: await historico(simbolo, periodo) });
  } catch {
    return erro("Histórico indisponível agora.", 502);
  }
}
