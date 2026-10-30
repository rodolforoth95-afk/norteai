import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { listarAtivos } from "@/lib/servidor/brapi";
import { dentroDoLimite, erro } from "@/lib/servidor/util";

export async function GET(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`busca:${uid}`, 120, 60 * 60 * 1000)) return erro("Muitas buscas. Tente em alguns minutos.", 429);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 40) return NextResponse.json({ resultados: [] });
  try {
    const resultados = (await listarAtivos({ busca: q, ordenar: "volume", limite: 12 })).slice(0, 8);
    return NextResponse.json({ resultados });
  } catch {
    return erro("Busca indisponível agora.", 502);
  }
}
