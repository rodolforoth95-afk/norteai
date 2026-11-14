import { CalendarClock, Coins, Info } from "lucide-react";
import type { CarteiraDados } from "@/lib/dominio/carteira";
import { proventosDaCarteira } from "@/lib/servidor/carteira-mercado";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const mesCurto = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

// Proventos (dividendos, JCP e rendimentos) dos ativos de bolsa da carteira, pela quantidade atual.
export async function Proventos({ carteira }: { carteira: CarteiraDados }) {
  const r = await proventosDaCarteira(carteira).catch(() => null);
  if (!r) return null;
  const maior = Math.max(1, ...r.porMes.map((m) => m.total));
  const semDados = r.ativos.every((a) => !a.disponivel);

  return (
    <div className="painel flex flex-col gap-5 p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="degrade-ativo flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Coins className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">Proventos</h2>
            <p className="text-xs text-suave">Dividendos, JCP e rendimentos dos seus ativos de bolsa nos últimos 12 meses</p>
          </div>
        </div>
      </div>

      {semDados ? (
        <p className="flex items-start gap-2 rounded-xl bg-superficie-2/60 p-4 text-sm text-suave">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ciano" aria-hidden="true" />
          O histórico de proventos de {r.indisponiveis.join(", ")} depende do plano completo da fonte de cotações (brapi). Assim que ele for ativado, os valores aparecem aqui automaticamente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-superficie-2/60 p-3.5">
              <p className="text-xs text-suave">Recebidos em 12 meses</p>
              <p className="font-display text-xl font-semibold tabular-nums text-texto">{brl(r.recebidos12m)}</p>
            </div>
            <div className="rounded-xl bg-gravata/10 p-3.5">
              <p className="text-xs text-suave">Média por mês</p>
              <p className="font-display text-xl font-semibold tabular-nums text-gravata">{brl(r.mediaMensal)}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-superficie-2/60 p-3.5 sm:col-span-1">
              <p className="text-xs text-suave">Próximo pagamento</p>
              <p className="font-display text-xl font-semibold tabular-nums text-texto">{r.proximos[0] ? brl(r.proximos[0].total) : "—"}</p>
              <p className="text-[11px] text-suave">{r.proximos[0] ? `${r.proximos[0].simbolo} · ${data(r.proximos[0].data)}` : "nenhum anunciado"}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-suave">Recebido por mês</p>
            <div className="flex h-28 items-end gap-1.5" role="img" aria-label={`Proventos por mês, total de ${brl(r.recebidos12m)} em 12 meses`}>
              {r.porMes.map((m) => (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-1" title={`${mesCurto(m.mes)}: ${brl(m.total)}`}>
                  <div className="degrade-ativo w-full max-w-7 rounded-t-md" style={{ height: `${Math.max(m.total ? 6 : 2, (m.total / maior) * 92)}px`, opacity: m.total ? 1 : 0.25 }} />
                  <span className="text-[10px] text-suave">{mesCurto(m.mes)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-suave">
                <CalendarClock className="h-3.5 w-3.5 text-ciano" aria-hidden="true" /> Próximos pagamentos
              </p>
              {r.proximos.length ? (
                <ul className="divide-y divide-linha rounded-xl border border-linha">
                  {r.proximos.map((p, i) => (
                    <li key={`${p.simbolo}-${p.data}-${i}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <span>
                        <span className="font-semibold text-texto">{p.simbolo}</span> <span className="text-xs text-suave">· {p.tipo} · {data(p.data)}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-texto">{brl(p.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-linha p-3.5 text-sm text-suave">Nenhum pagamento anunciado ainda.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-suave">Por ativo (12 meses)</p>
              <ul className="divide-y divide-linha rounded-xl border border-linha">
                {r.ativos.map((a) => (
                  <li key={a.simbolo} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span>
                      <span className="font-semibold text-texto">{a.simbolo}</span> <span className="text-xs text-suave">· {a.quantidade.toLocaleString("pt-BR")} un.</span>
                    </span>
                    <span className={`tabular-nums ${a.disponivel ? "font-semibold text-texto" : "text-xs text-suave"}`}>{a.disponivel ? brl(a.recebidos12m) : "plano completo"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {r.indisponiveis.length ? (
            <p className="text-xs text-suave">
              {r.indisponiveis.join(", ")}: histórico de proventos disponível no plano completo da brapi. Valores calculados pela quantidade que você tem hoje.
            </p>
          ) : (
            <p className="text-xs text-suave">Valores calculados pela quantidade que você tem hoje; podem diferir do que caiu na corretora se a posição mudou.</p>
          )}
        </>
      )}
    </div>
  );
}
