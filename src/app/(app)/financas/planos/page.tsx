import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import { hojeBR } from "@/lib/dominio/carteira";
import {
  escadaGuardar,
  mesDe,
  planosDe,
  progressoMeta,
  rendaGuardadaAtual,
  PASSO_RITMO,
} from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { aportesPorMes, carregarFinancas } from "@/lib/servidor/financas";
import { brl0 } from "@/components/financas/formato";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { AbasFinancas } from "../AbasFinancas";

export const metadata = { title: "Planos" };

// Planos: metas de guardar e de investir que acompanham o controle financeiro.
export default async function PaginaPlanos() {
  const { uid, repo } = await exigirUsuario();
  const [dados, aportes] = await Promise.all([
    carregarFinancas(repo, uid),
    aportesPorMes(repo, uid),
  ]);
  const mesAtual = mesDe(hojeBR());
  const planos = planosDe(dados);
  const temControle = dados.lancamentos.length > 0;
  const rendaAtual = rendaGuardadaAtual(dados, mesAtual);

  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">
            Finanças
          </h1>
          <p className="mt-0.5 text-sm text-suave">
            Seus planos usam o controle financeiro para mostrar se você está
            chegando lá.
          </p>
        </div>
        <AbasFinancas ativa="planos" planos={planos.length} />
      </header>

      {!planos.length ? (
        <div className="painel grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:p-8">
          <div className="flex flex-col gap-3">
            <span className="degrade-ativo flex h-12 w-12 items-center justify-center rounded-2xl text-white">
              <Target className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-semibold text-texto">
              Transforme o seu controle em um plano
            </h2>
            <p className="text-sm leading-relaxed text-suave">
              O controle financeiro mostra o que já aconteceu. O plano diz aonde
              você quer chegar: quanto da renda guardar, quanto investir por mês
              e com qual objetivo. Depois, cada lançamento que você faz atualiza
              o progresso.
            </p>
            {temControle ? (
              <Link
                href="/financas/planos/novo"
                className="gradiente-marca mt-1 flex h-11 w-fit items-center gap-2 rounded-full px-6 text-sm font-semibold text-white hover:brightness-110"
              >
                Criar meu primeiro plano{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href="/financas"
                className="mt-1 flex h-11 w-fit items-center gap-2 rounded-full border border-linha px-5 text-sm font-semibold text-texto hover:bg-superficie-2"
              >
                <Wallet className="h-4 w-4" aria-hidden="true" /> Começar pelo
                controle financeiro
              </Link>
            )}
            {!temControle ? (
              <p className="text-xs text-suave">
                Para montar um plano realista, registre antes algumas receitas e
                despesas.
              </p>
            ) : null}
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {[
              [
                "Ponto de partida",
                "A média do que entra, sai e sobra, vinda do seu controle",
              ],
              [
                "Quanto guardar",
                `Hoje você guarda cerca de ${rendaAtual}% da renda. Escolha o alvo e o ritmo`,
              ],
              [
                "Plano de aporte",
                "Valor por mês, prazo, objetivo e limites por categoria",
              ],
              ["Acompanhar", "Cada lançamento no controle atualiza o plano"],
            ].map(([t, d], i) => (
              <li
                key={t}
                className="flex items-start gap-3 rounded-2xl bg-superficie-2/60 p-3.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ciano/15 text-xs font-bold text-ciano">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-texto">
                    {t}
                  </span>
                  <span className="block text-xs leading-relaxed text-suave">
                    {d}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {planos.map((m) => {
            const pr = progressoMeta(dados, m, mesAtual, aportes);
            const esc = m.guardar
              ? escadaGuardar(dados, m.guardar, mesAtual)
              : null;
            return (
              <li key={m.id} className="min-w-0">
                <Link
                  href={`/financas/planos/${m.id}`}
                  className={`painel group flex h-full flex-col gap-4 p-5 transition hover:-translate-y-0.5 ${m.ativa ? "ring-2 ring-ciano/60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                      <Target className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {m.ativa ? (
                        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ciano">
                          <Sparkles className="h-3 w-3" aria-hidden="true" /> Em
                          foco no controle
                        </p>
                      ) : null}
                      <h2 className="truncate font-display text-lg font-semibold text-texto">
                        {m.nome}
                      </h2>
                      <p className="truncate text-xs text-suave">
                        {brl0(m.valorMensal)}/mês para {m.destino.toLowerCase()}{" "}
                        · {m.meses} meses
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-superficie-2/60 p-3">
                      <p className="flex items-center gap-1 text-[11px] text-suave">
                        <Trophy
                          className="h-3 w-3 text-ciano"
                          aria-hidden="true"
                        />{" "}
                        Guardar
                      </p>
                      <p className="font-display text-base font-semibold tabular-nums text-texto">
                        {m.guardar ? `${m.guardar.alvoPct}% da renda` : "—"}
                      </p>
                      {esc?.atual ? (
                        <p className="text-[11px] text-suave">
                          mês: {Math.round(esc.atual.guardadoPct ?? 0)}% de{" "}
                          {esc.atual.alvoPct}%
                        </p>
                      ) : m.guardar ? (
                        <p className="text-[11px] text-suave">
                          ritmo{" "}
                          {PASSO_RITMO[m.guardar.ritmo].rotulo.toLowerCase()}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-superficie-2/60 p-3">
                      <p className="flex items-center gap-1 text-[11px] text-suave">
                        <BarChart3
                          className="h-3 w-3 text-ciano"
                          aria-hidden="true"
                        />{" "}
                        Acumulado
                      </p>
                      <p className="font-display text-base font-semibold tabular-nums text-texto">
                        {brl0(pr.economizado)}
                      </p>
                      <p className="text-[11px] text-suave">
                        de {brl0(pr.objetivo)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-superficie-2">
                      <div
                        className="degrade-ativo h-full rounded-full"
                        style={{
                          width: `${Math.max(2, Math.min(100, pr.pct))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 flex justify-between text-[11px] text-suave">
                      <span>{Math.round(pr.pct)}% do objetivo</span>
                      <span>
                        mês {pr.mesesPassados} de {m.meses}
                      </span>
                    </p>
                  </div>
                  <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-ciano">
                    Ver plano{" "}
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <Link
              href={temControle ? "/financas/planos/novo" : "/financas"}
              className="flex h-full min-h-[15rem] flex-col items-center justify-center gap-3 rounded-[1.375rem] border-2 border-dashed border-linha p-6 text-center transition hover:border-ciano hover:bg-ciano/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ciano/15 text-ciano">
                <Plus className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold text-texto">
                Novo plano
              </span>
              <span className="max-w-xs text-sm text-suave">
                Uma meta diferente, como reserva de emergência ou uma viagem,
                usando o mesmo controle financeiro.
              </span>
            </Link>
          </li>
        </ul>
      )}
      <AvisoEducacional extra="Os planos usam apenas os seus lançamentos e não indicam produtos financeiros." />
    </section>
  );
}
