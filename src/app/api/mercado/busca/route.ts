import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { listarAtivos } from "@/lib/servidor/brapi";
import { listarCriptos } from "@/lib/servidor/cripto";
import { dentroDoLimite, erro } from "@/lib/servidor/util";

export async function GET(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`busca:${uid}`, 120, 60 * 60 * 1000)) return erro("Muitas buscas. Tente em alguns minutos.", 429);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 40) return NextResponse.json({ resultados: [] });
  const termo = q.toLowerCase();
  const [acoes, criptos] = await Promise.all([
    listarAtivos({ busca: q, ordenar: "volume", limite: 12 }).catch(() => null),
    listarCriptos(100),
  ]);
  // Criptos vêm da CoinGecko; entram na busca pelo nome ou pelo símbolo (BTC, ETH…).
  const cripto = criptos
    .filter((c) => c.simbolo.toLowerCase() === termo || c.nome.toLowerCase().includes(termo) || c.simbolo.toLowerCase().startsWith(termo))
    .slice(0, 4)
    .map((c) => ({ simbolo: c.simbolo, nome: `${c.nome} · cripto`, logo: c.logo, preco: c.preco, variacaoPct: c.variacao24h, href: `/mercado/cripto/${c.id}` }));
  if (!acoes && !cripto.length) return erro("Busca indisponível agora.", 502);
  return NextResponse.json({ resultados: [...cripto, ...(acoes ?? []).slice(0, 8 - Math.min(cripto.length, 4))] });
}
