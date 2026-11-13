"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Repeat, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { nomeMes, planejar, type Categoria, type Diagnostico, type MetaEconomia, type Plano } from "@/lib/dominio/financas";
import { encerrarMeta, gerarPlanoIA, salvarMeta } from "@/app/acoes-financas";
import { Mascote } from "@/components/Logo";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl0, lerValor } from "@/components/financas/formato";

type Dias = 30 | 60 | 90;
type Progresso = { economizado: number; aportado: number; livreParaAportar: number; objetivo: number; pct: number; mesesPassados: number; meses: { mes: string; sobra: number; aportado: number }[] };

const DESTINOS = ["Reserva de emergência", "Renda fixa", "FIIs", "Ações", "Previdência", "Objetivo pessoal"];
const TATICAS: Record<string, string> = {
  delivery: "pedir só no fim de semana e cozinhar em lote no domingo",
  alimentacao: "levar marmita dois dias por semana e trocar um jantar fora por um em casa",
  lazer: "alternar programas pagos com gratuitos e definir um teto por saída",
  compras: "esperar 48 horas antes de comprar o que não estava planejado",
  assinaturas: "cancelar o serviço menos usado e revezar os de streaming por mês",
  cuidados: "espaçar um pouco os serviços e comparar preços",
  transporte: "juntar deslocamentos e trocar parte das corridas por transporte público",
  outros: "anotar cada gasto avulso por uma semana para achar o vazamento",
};

// Texto do plano montado no próprio app (usado quando a IA não está ligada).
function textoLocal(plano: Plano, diag: Diagnostico, destino: string, meses: number, nome: (id: string) => string) {
  const linhas: string[] = [];
  linhas.push(
    `Nos últimos ${diag.meses.length || 1} ${diag.meses.length === 1 ? "mês" : "meses"} entraram, em média, ${brl0(diag.receitaMedia)} e saíram ${brl0(diag.despesaMedia)}, sobrando ${brl0(Math.max(0, diag.sobraMedia))}. ` +
      (plano.faltaCortar <= 0
        ? `Essa sobra já cobre os ${brl0(plano.metaMensal)} por mês: basta separar o valor logo que o salário cair.`
        : plano.atingivel
          ? `Para chegar a ${brl0(plano.metaMensal)} por mês faltam ${brl0(plano.faltaCortar)}, e dá para tirar isso só dos gastos variáveis.`
          : `Chegar a ${brl0(plano.metaMensal)} por mês exige cortar ${brl0(plano.faltaCortar)}; com ajustes realistas consigo ${brl0(plano.cortado)}. Vale começar por aí e revisar a meta.`),
  );
  for (const c of plano.cortes.slice(0, 4)) {
    linhas.push(`• ${nome(c.categoriaId)}: reduzir ${c.percentual}% (≈ ${brl0(c.corteMensal)}/mês), ${TATICAS[c.categoriaId] ?? "revisando os gastos menos importantes"}.`);
  }
  linhas.push(`Mantendo o ritmo, em ${meses} ${meses === 1 ? "mês" : "meses"} você terá separado ${brl0(plano.totalNoPeriodo)} para ${destino.toLowerCase()}. Moradia, saúde, educação e contas da casa ficaram de fora dos cortes.`);
  return linhas.join("\n");
}

export function PlanoMordomo({
  diagnosticos,
  categorias,
  meta,
  progresso,
  ia,
  temLancamentos,
}: {
  diagnosticos: Record<Dias, Diagnostico>;
  categorias: Categoria[];
  meta: MetaEconomia | null;
  progresso: Progresso | null;
  ia: boolean;
  temLancamentos: boolean;
}) {
  const router = useRouter();
  const [dias, setDias] = useState<Dias>(90);
  const [valorTexto, setValorTexto] = useState(meta ? String(meta.valorMensal) : "500");
  const [meses, setMeses] = useState(meta?.meses ?? 12);
  const [destino, setDestino] = useState(meta?.destino ?? "FIIs");
  const [nomeMeta, setNomeMeta] = useState(meta?.nome ?? "");
  const [textoIA, setTextoIA] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [escrevendo, setEscrevendo] = useState(false);
  const [editando, setEditando] = useState(!meta);

  const nome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "Outros";
  const cat = (id: string) => categorias.find((c) => c.id === id);
  const diag = diagnosticos[dias];
  const valorMensal = lerValor(valorTexto) ?? 0;
  const plano = useMemo(() => planejar(diag, valorMensal, meses), [diag, valorMensal, meses]);
  const narrativa = textoIA ?? textoLocal(plano, diag, destino, meses, nome);
  const semHistorico = !diag.meses.length;

  function ativar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarMeta({ nome: nomeMeta.trim() || `${brl0(valorMensal)}/mês para ${destino}`, destino, valorMensal, meses, dias });
      if ("erro" in r) setErro(r.erro);
      else {
        setEditando(false);
        router.refresh();
      }
    });
  }

  async function escrever() {
    setErro(null);
    setEscrevendo(true);
    const r = await gerarPlanoIA({ valorMensal, meses, destino, dias });
    setEscrevendo(false);
    if ("erro" in r) setErro(r.erro);
    else setTextoIA(r.texto);
  }

  if (!temLancamentos) {
    return (
      <div className="painel flex flex-col items-center gap-3 p-8 text-center">
        <Mascote className="h-12 w-12" />
        <p className="font-semibold text-texto">Preciso conhecer seus gastos primeiro</p>
        <p className="max-w-sm text-sm text-suave">Lance algumas receitas e despesas (ou carregue o exemplo em Finanças) e eu monto o diagnóstico.</p>
        <Link href="/financas" className="mt-1 h-11 rounded-xl border border-linha px-5 pt-2.5 text-sm font-semibold text-texto hover:bg-superficie-2">
          Ir para Finanças
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* Meta ativa */}
      {meta && progresso && !editando ? (
        <div className="painel flex flex-col gap-4 p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-menta">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Plano ativo desde {nomeMes(meta.inicio)}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-texto">{meta.nome}</h2>
              <p className="text-sm text-suave">
                {brl0(meta.valorMensal)} por mês para {meta.destino} · {meta.meses} meses
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditando(true)} className="h-10 rounded-xl border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2">
                Refazer plano
              </button>
              <button
                type="button"
                disabled={pendente}
                onClick={() =>
                  window.confirm("Encerrar este plano? O histórico de lançamentos continua.") &&
                  iniciar(async () => {
                    const r = await encerrarMeta(meta.id);
                    if ("erro" in r) setErro(r.erro);
                    else router.refresh();
                  })
                }
                className="h-10 rounded-xl px-3 text-sm font-semibold text-suave hover:bg-superficie-2 hover:text-erro"
              >
                Encerrar
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { rotulo: "Economizado até agora", valor: progresso.economizado, cor: "text-texto" },
              { rotulo: "Já aportado na carteira", valor: progresso.aportado, cor: "text-texto" },
              { rotulo: "Livre para aportar", valor: progresso.livreParaAportar, cor: "text-gravata" },
            ].map((x) => (
              <div key={x.rotulo} className="rounded-xl bg-superficie-2/60 p-3.5">
                <p className="text-xs text-suave">{x.rotulo}</p>
                <p className={`font-display text-xl font-bold tabular-nums ${x.cor}`}>{brl0(x.valor)}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="h-2.5 overflow-hidden rounded-full bg-superficie-2">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#2D5BFF,#FF8A3D)]" style={{ width: `${Math.max(2, progresso.pct)}%` }} />
            </div>
            <p className="mt-1.5 flex justify-between text-xs text-suave">
              <span>
                {Math.round(progresso.pct)}% de {brl0(progresso.objetivo)}
              </span>
              <span>
                mês {progresso.mesesPassados} de {meta.meses}
              </span>
            </p>
          </div>
          {progresso.meses.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {progresso.meses.slice(-6).map((m) => {
                const ok = m.sobra >= meta.valorMensal;
                return (
                  <li key={m.mes} className={`rounded-xl border p-2.5 text-center ${ok ? "border-menta/40 bg-menta/8" : "border-linha"}`}>
                    <p className="text-[11px] text-suave">{nomeMes(m.mes, true)}</p>
                    <p className={`text-sm font-bold tabular-nums ${ok ? "text-menta" : "text-texto"}`}>{brl0(m.sobra)}</p>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {progresso.livreParaAportar >= 50 ? (
            <Link href="/carteira/adicionar" className="gradiente-marca flex h-11 items-center justify-center rounded-full text-sm font-bold text-white hover:brightness-110 sm:w-fit sm:px-6">
              Registrar aporte de {brl0(progresso.livreParaAportar)}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Diagnóstico */}
      <div className="painel flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-texto">Diagnóstico dos seus gastos</h2>
            <p className="text-sm text-suave">{semHistorico ? "Ainda sem meses completos: uso o mês atual." : `Média de ${diag.meses.map((m) => nomeMes(m, true)).join(", ")}`}</p>
          </div>
          <div className="flex rounded-full border border-linha bg-superficie-2 p-1" role="radiogroup" aria-label="Período">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={dias === d}
                onClick={() => {
                  setDias(d);
                  setTextoIA(null);
                }}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold ${dias === d ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { rotulo: "Receita média", valor: diag.receitaMedia, cor: "text-menta" },
            { rotulo: "Despesa média", valor: diag.despesaMedia, cor: "text-texto" },
            { rotulo: "Fixas e essenciais", valor: diag.fixasMedia, cor: "text-texto" },
            { rotulo: "Sobra média", valor: diag.sobraMedia, cor: diag.sobraMedia >= 0 ? "text-ciano" : "text-erro" },
          ].map((x) => (
            <div key={x.rotulo} className="rounded-xl bg-superficie-2/60 p-3.5">
              <p className="text-xs text-suave">{x.rotulo}</p>
              <p className={`font-display text-lg font-bold tabular-nums ${x.cor}`}>{brl0(x.valor)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-texto">
              <TrendingDown className="h-4 w-4 text-erro" aria-hidden="true" /> Ralos encontrados
            </h3>
            {diag.ralos.length ? (
              <ul className="flex flex-col gap-2">
                {diag.ralos.map((r) => {
                  const c = cat(r.categoriaId);
                  return (
                    <li key={r.categoriaId} className="flex items-start gap-3 rounded-xl border border-linha p-3">
                      {c ? <IconeCategoria icone={c.icone} cor={c.cor} tamanho={34} /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-semibold text-texto">{nome(r.categoriaId)}</span>
                          <span className="shrink-0 tabular-nums text-texto">{brl0(r.mediaMensal)}/mês</span>
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-suave">{r.motivo}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-linha p-4 text-sm text-suave">Nenhum gasto variável fora do padrão. Bom sinal.</p>
            )}
          </div>
          <div>
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-texto">
              <Repeat className="h-4 w-4 text-ciano" aria-hidden="true" /> Cobranças que se repetem
            </h3>
            {diag.assinaturas.length ? (
              <ul className="divide-y divide-linha rounded-xl border border-linha">
                {diag.assinaturas.map((a) => (
                  <li key={a.descricao} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="truncate text-texto">{a.descricao}</span>
                    <span className="shrink-0 tabular-nums text-suave">{brl0(a.valorMensal)}/mês</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 bg-superficie-2/40 px-3.5 py-2.5 text-sm font-semibold">
                  <span className="text-texto">Total por ano</span>
                  <span className="tabular-nums text-texto">{brl0(diag.assinaturas.reduce((s, a) => s + a.valorMensal, 0) * 12)}</span>
                </li>
              </ul>
            ) : (
              <p className="rounded-xl border border-linha p-4 text-sm text-suave">Nenhuma assinatura identificada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Simulador de meta */}
      {editando || !meta ? (
        <div className="painel grid gap-6 p-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:p-6">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold text-texto">Sua meta</h2>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-suave">Quanto quer investir por mês</span>
              <span className="flex h-12 items-center gap-2 rounded-xl border border-linha bg-superficie-2 px-3.5 focus-within:border-ciano">
                <span className="text-suave">R$</span>
                <input value={valorTexto} onChange={(e) => { setValorTexto(e.target.value); setTextoIA(null); }} inputMode="decimal" className="w-full bg-transparent font-display text-lg font-bold tabular-nums text-texto outline-none" />
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex justify-between text-xs font-semibold text-suave">
                Por quanto tempo <span className="text-texto">{meses} {meses === 1 ? "mês" : "meses"}</span>
              </span>
              <input type="range" min={1} max={60} value={meses} onChange={(e) => { setMeses(Number(e.target.value)); setTextoIA(null); }} className="accent-[var(--destaque)]" />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-suave">Para onde vai o dinheiro</span>
              <div className="flex flex-wrap gap-1.5">
                {DESTINOS.map((d) => (
                  <button key={d} type="button" onClick={() => { setDestino(d); setTextoIA(null); }} className={`min-h-9 rounded-full border px-3 text-[13px] font-medium ${destino === d ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-suave">Nome da meta (opcional)</span>
              <input value={nomeMeta} onChange={(e) => setNomeMeta(e.target.value)} maxLength={60} placeholder={`${brl0(valorMensal)}/mês para ${destino}`} className="h-11 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm text-texto outline-none placeholder:text-suave/70 focus:border-ciano" />
            </label>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className={`flex items-start gap-3 rounded-2xl p-4 ${plano.atingivel ? "bg-menta/10" : "bg-gravata/10"}`}>
              {plano.atingivel ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-menta" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gravata" aria-hidden="true" />}
              <div className="text-sm">
                <p className="font-semibold text-texto">
                  {plano.faltaCortar <= 0 ? "A sobra atual já cobre a meta" : plano.atingivel ? `Alcançável cortando ${brl0(plano.cortado)} por mês` : `Os cortes realistas chegam a ${brl0(plano.sobraAtual + plano.cortado)} de ${brl0(plano.metaMensal)}`}
                </p>
                <p className="mt-0.5 text-suave">
                  Em {meses} {meses === 1 ? "mês" : "meses"}: {brl0(plano.totalNoPeriodo)} para {destino.toLowerCase()}.
                </p>
              </div>
            </div>

            {plano.cortes.length ? (
              <ul className="flex flex-col gap-2.5">
                {plano.cortes.map((c) => {
                  const ct = cat(c.categoriaId);
                  return (
                    <li key={c.categoriaId} className="flex items-center gap-3">
                      {ct ? <IconeCategoria icone={ct.icone} cor={ct.cor} tamanho={32} /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-texto">{nome(c.categoriaId)}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-erro">−{brl0(c.corteMensal)}</span>
                        </p>
                        <p className="text-xs text-suave">
                          de {brl0(c.mediaMensal)} para {brl0(c.limiteMensal)} por mês ({c.percentual}%)
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="rounded-2xl border border-linha bg-superficie-2/40 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-suave">
                <Mascote className="h-5 w-5" /> {textoIA ? "Plano escrito pelo Mordomo (IA)" : "Plano do Mordomo"}
              </p>
              <div className="whitespace-pre-line text-sm leading-relaxed text-texto">{narrativa}</div>
            </div>

            {erro ? (
              <p role="alert" className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro">
                {erro}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={ativar} disabled={pendente || valorMensal < 10} className="gradiente-marca flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold text-white hover:brightness-110 disabled:opacity-60">
                {pendente ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                Ativar este plano
              </button>
              <button
                type="button"
                onClick={escrever}
                disabled={!ia || escrevendo || valorMensal < 10}
                title={ia ? undefined : "A IA ainda não está ligada"}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2 disabled:opacity-50"
              >
                {escrevendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-ciano" aria-hidden="true" />}
                {ia ? "Pedir à IA" : "IA em breve"}
              </button>
            </div>
            {meta ? (
              <button type="button" onClick={() => setEditando(false)} className="text-sm text-suave hover:text-texto">
                Cancelar e manter o plano atual
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
