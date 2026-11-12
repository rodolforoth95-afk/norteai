import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { AVISO_MERCADO } from "@/components/mercado";
import { PERIODO_ANALISE, listarAtivos } from "@/lib/servidor/brapi";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { Comparador } from "./Comparador";

export const metadata = { title: "Comparar ativos" };

const TEXTO_PERIODO: Record<string, string> = { "3mo": "3 meses", "6mo": "6 meses", "1y": "12 meses", "2y": "2 anos", "5y": "5 anos" };

// Comparativo de até 5 ativos: desempenho em base 100, mês a mês e estatísticas de risco.
export default async function PaginaComparar({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await exigirUsuario();
  const { s } = await searchParams;
  let iniciais = (s ?? "")
    .toUpperCase()
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\^?[A-Z0-9]{3,12}$/.test(x))
    .slice(0, 5);
  // Sem escolha: o Ibovespa e as três ações mais negociadas do dia (só como ponto de partida).
  if (!iniciais.length) {
    const maisNegociadas = await listarAtivos({ tipo: "stock", ordenar: "volume", limite: 5 }).catch(() => []);
    iniciais = ["^BVSP", ...maisNegociadas.slice(0, 3).map((a) => a.simbolo)];
  } else if (iniciais.length === 1 && iniciais[0] !== "^BVSP") {
    iniciais = [...iniciais, "^BVSP"];
  }

  return (
    <section className="flex flex-col gap-6">
      <Link href="/mercado" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Mercado
      </Link>
      <div>
        <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">Comparar ativos</h1>
        <p className="mt-1 max-w-3xl text-sm text-suave">
          Coloque até 5 ações, FIIs, ETFs ou o Ibovespa lado a lado e veja como cada um se comportou mês a mês: quanto subiu ou caiu, quanto oscilou e qual foi o maior susto do período.
        </p>
      </div>
      <Comparador iniciais={iniciais} periodoAnalise={TEXTO_PERIODO[PERIODO_ANALISE] ?? PERIODO_ANALISE} />
      <AvisoEducacional extra={`${AVISO_MERCADO} Rentabilidade passada não garante resultado futuro.`} />
    </section>
  );
}
