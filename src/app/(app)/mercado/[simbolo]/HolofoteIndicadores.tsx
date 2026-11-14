import { Info, Sparkles } from "lucide-react";
import type { Indicadores } from "@/lib/servidor/brapi";

const num = (v: number | null, casas = 2) => (v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas }));

// Leitura educativa do P/VP (nunca recomendação).
function leituraPvp(pvp: number, fii: boolean) {
  const base = fii ? "das cotas" : "da empresa";
  if (pvp < 0.9) return `O mercado paga ${num(pvp)} por cada R$ 1 de patrimônio ${base}: abaixo do valor contábil. Pode indicar desconto ou desconfiança; vale entender o motivo.`;
  if (pvp <= 1.1) return `O preço está perto do valor patrimonial ${base} (cerca de R$ ${num(pvp)} por R$ 1 de patrimônio).`;
  return `O mercado paga ${num(pvp)} por cada R$ 1 de patrimônio ${base}: acima do valor contábil, o que costuma refletir expectativa de lucros ou ativos que o balanço não mostra.`;
}

export function HolofoteIndicadores({ ind, simbolo }: { ind: Indicadores; simbolo: string }) {
  const fii = /11$/.test(simbolo);
  const pvp = ind.precoValorPatrimonial;
  return (
    <div className="relative overflow-hidden rounded-[1.375rem] border border-linha bg-superficie p-5 shadow-[var(--sombra-cartao)] lg:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(45_91_255/0.22),transparent_70%)]" aria-hidden="true" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="degrade-ativo flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl text-white">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">P/VP</span>
            <span className="font-display text-3xl font-semibold tabular-nums leading-none">{num(pvp)}</span>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ciano">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Em destaque
            </p>
            <p className="font-display text-lg font-semibold text-texto">Preço sobre valor patrimonial</p>
            <p className="text-xs text-suave">Quanto o mercado paga por R$ 1 do patrimônio {fii ? "do fundo" : "da empresa"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-texto">
            {pvp !== null ? leituraPvp(pvp, fii) : "O P/VP deste ativo vem do plano completo da fonte de cotações (brapi) e aparece aqui assim que ele for ativado."}
          </p>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { rotulo: "P/L", valor: num(ind.precoLucro), dica: "preço ÷ lucro por ação" },
              { rotulo: "Dividend yield", valor: ind.dividendYield === null ? "—" : `${num(ind.dividendYield, 1)}%`, dica: "proventos de 12 meses ÷ preço" },
              { rotulo: fii ? "VP por cota" : "VPA", valor: ind.valorPatrimonialPorAcao === null ? "—" : `R$ ${num(ind.valorPatrimonialPorAcao)}`, dica: "patrimônio ÷ número de ações" },
            ].map((x) => (
              <div key={x.rotulo} className="rounded-xl bg-superficie-2/70 px-3 py-2.5" title={x.dica}>
                <dt className="text-[11px] text-suave">{x.rotulo}</dt>
                <dd className="font-display text-base font-semibold tabular-nums text-texto">{x.valor}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-1.5 text-[11px] text-suave">
            <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" /> Indicadores ajudam a comparar, mas nenhum sozinho diz se um ativo está caro ou barato. Conteúdo educacional.
          </p>
        </div>
      </div>
    </div>
  );
}
