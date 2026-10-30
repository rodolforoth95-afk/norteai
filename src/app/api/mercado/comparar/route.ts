import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { candles } from "@/lib/servidor/brapi";
import { dentroDoLimite, erro } from "@/lib/servidor/util";

const MAXIMO_COMPARACAO = 5;

// Fechamentos diários de até 5 ativos, para o comparativo. Cada ativo fica 1 h em cache.
export async function GET(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`comparar:${uid}`, 60, 60 * 60 * 1000)) return erro("Muitas consultas. Tente em alguns minutos.", 429);
  const simbolos = [...new Set((new URL(req.url).searchParams.get("s") ?? "").toUpperCase().split(",").map((s) => s.trim()).filter(Boolean))];
  if (!simbolos.length || simbolos.length > MAXIMO_COMPARACAO || simbolos.some((s) => !/^\^?[A-Z0-9]{3,12}$/.test(s))) {
    return erro(`Informe de 1 a ${MAXIMO_COMPARACAO} códigos válidos.`, 400);
  }
  const ativos = [];
  const falhas: string[] = [];
  for (const simbolo of simbolos) {
    try {
      const velas = await candles(simbolo);
      if (velas.length < 2) throw new Error();
      ativos.push({ simbolo, pontos: velas.map((v) => ({ data: v.data, fechamento: v.fechamento, maxima: v.maxima, minima: v.minima, abertura: v.abertura, volume: v.volume })) });
    } catch {
      falhas.push(simbolo);
    }
  }
  return NextResponse.json({ ativos, falhas });
}
