"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Layers, PiggyBank, Repeat, Target, Wallet, X } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { nomeMes, somarMeses, type Categoria, type Insight, type ItemOrcamento, type Ocorrencia, type ResumoMes } from "@/lib/dominio/financas";
import { Mascote } from "@/components/Logo";
import { useCoresTema } from "@/components/useCoresTema";
import { useLancador } from "@/components/financas/Lancador";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl, brl0, dataCurta } from "@/components/financas/formato";
import { BotaoExemploFinancas } from "./BotoesExemplo";

type Props = {
  hoje: string;
  mes: string;
  mesAtual: string;
  resumo: ResumoMes;
  anterior: ResumoMes;
  serie: { mes: string; receitas: number; despesas: number; reinvestido: number }[];
  aportadoNoMes: number;
  ocorrencias: Ocorrencia[];
  categorias: Categoria[];
  orcamento: ItemOrcamento[];
  meta: { nome: string; destino: string; valorMensal: number; meses: number } | null;
  progresso: { economizado: number; aportado: number; livreParaAportar: number; objetivo: number; pct: number; mesesPassados: number } | null;
  avisos: Insight[];
  temExemplo: boolean;
};

const compacto = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }));

function variacao(atual: number, antes: number) {
  if (!antes) return null;
  return ((atual - antes) / antes) * 100;
}

export function PainelFinancas(p: Props) {
  const { abrir } = useLancador();
  const tema = useCoresTema();
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "despesa" | "receita">("todos");
  const cat = (id: string) => p.categorias.find((c) => c.id === id);

  // Gastos por categoria principal (subcategorias somam na principal).
  const porPrincipal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const pc of p.resumo.porCategoria) {
      const c = cat(pc.categoriaId);
      const id = c?.paiId ?? pc.categoriaId;
      mapa.set(id, (mapa.get(id) ?? 0) + pc.total);
    }
    return [...mapa.entries()].map(([id, total]) => ({ id, total, nome: cat(id)?.nome ?? "Outros", cor: cat(id)?.cor ?? "#94A3B8" })).sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.resumo, p.categorias]);

  const lista = p.ocorrencias.filter((o) => {
    if (filtroTipo !== "todos" && o.tipo !== filtroTipo) return false;
    if (!filtroCategoria) return true;
    const c = cat(o.categoriaId);
    return o.categoriaId === filtroCategoria || c?.paiId === filtroCategoria;
  });
  const porDia = new Map<string, Ocorrencia[]>();
  for (const o of lista) porDia.set(o.data, [...(porDia.get(o.data) ?? []), o]);

  const saldo = p.resumo.saldo;
  const potencial = Math.max(0, saldo - p.aportadoNoMes);
  const ehMesAtual = p.mes === p.mesAtual;

  const cartoes = [
    { rotulo: "Receitas", valor: p.resumo.receitas, Icone: ArrowUpRight, cor: "text-menta", delta: variacao(p.resumo.receitas, p.anterior.receitas), bom: "sobe" as const },
    { rotulo: "Despesas", valor: p.resumo.despesas, Icone: ArrowDownRight, cor: "text-erro", delta: variacao(p.resumo.despesas, p.anterior.despesas), bom: "desce" as const },
    { rotulo: "Saldo livre", valor: saldo, Icone: Wallet, cor: saldo >= 0 ? "text-ciano" : "text-erro", detalhe: p.resumo.receitas > 0 ? `${Math.round((saldo / p.resumo.receitas) * 100)}% das receitas` : "receitas − despesas" },
    {
      rotulo: "Potencial de aporte",
      valor: potencial,
      Icone: PiggyBank,
      cor: "text-gravata",
      detalhe: p.aportadoNoMes > 0 ? `${brl0(p.aportadoNoMes)} já aplicados` : p.meta ? `meta de ${brl0(p.meta.valorMensal)}` : "ainda não aplicado",
    },
  ];

  function editar(o: Ocorrencia) {
    abrir("texto", {
      id: o.id,
      tipo: o.tipo,
      valor: o.valor,
      data: o.dataBase,
      descricao: o.descricao,
      estabelecimento: o.estabelecimento,
      categoriaId: o.categoriaId,
      meio: o.meio,
      parcelas: 1,
      recorrente: o.recorrente,
      origem: "manual",
      parcela: o.parcela ? { atual: o.parcela.atual, total: o.parcela.total } : null,
    });
  }

  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      {/* Cabeçalho com o mês */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">Finanças</h1>
          <p className="mt-0.5 text-sm text-suave">Receitas, despesas e quanto sobra para investir.</p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <nav className="flex items-center rounded-xl border border-linha bg-superficie p-0.5" aria-label="Mês">
            <Link href={`/financas?mes=${somarMeses(p.mes, -1)}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold text-texto">{nomeMes(p.mes)}</span>
            <Link
              href={`/financas?mes=${somarMeses(p.mes, 1)}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto ${p.mes >= somarMeses(p.mesAtual, 12) ? "pointer-events-none opacity-30" : ""}`}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
          <div className="flex gap-1.5">
            <Link href="/financas/plano" className="flex h-10 items-center gap-1.5 rounded-xl border border-linha bg-superficie px-3 text-sm font-semibold text-texto hover:bg-superficie-2">
              <Target className="h-4 w-4 text-gravata" aria-hidden="true" />
              Plano
            </Link>
            <Link href="/financas/categorias" className="flex h-10 w-10 items-center justify-center rounded-xl border border-linha bg-superficie text-suave hover:bg-superficie-2 hover:text-texto" aria-label="Categorias">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mordomo: insights proativos */}
      {p.avisos.length ? (
        <div className="painel flex flex-col gap-0 overflow-hidden p-0">
          {p.avisos.map((a, i) => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 ${i ? "border-t border-linha" : ""}`}>
              {i === 0 ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-superficie-2">
                  <Mascote className="h-6 w-6" piscando />
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden="true">
                  <span className={`h-2 w-2 rounded-full ${a.tom === "alerta" ? "bg-erro" : a.tom === "atencao" ? "bg-gravata" : a.tom === "positivo" ? "bg-menta" : "bg-ciano"}`} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-texto">
                  {i === 0 ? <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${a.tom === "alerta" ? "bg-erro" : a.tom === "atencao" ? "bg-gravata" : a.tom === "positivo" ? "bg-menta" : "bg-ciano"}`} aria-hidden="true" /> : null}
                  {a.titulo}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-suave">{a.texto}</p>
                {a.acao ? (
                  <Link href={a.acao.href} className="mt-1.5 inline-block text-xs font-semibold text-ciano sm:hidden">
                    {a.acao.rotulo} →
                  </Link>
                ) : null}
              </div>
              {a.acao ? (
                <Link href={a.acao.href} className="hidden shrink-0 self-center rounded-lg px-3 py-1.5 text-xs font-semibold text-ciano hover:bg-superficie-2 sm:block">
                  {a.acao.rotulo}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Cartões */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="painel flex min-w-0 flex-col gap-2 p-4 lg:p-5">
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-suave">
              {c.rotulo}
              <c.Icone className={`h-4 w-4 ${c.cor}`} aria-hidden="true" />
            </span>
            <span className={`truncate font-display text-[1.3rem] font-black tabular-nums tracking-tight lg:text-[1.6rem] ${c.rotulo === "Saldo livre" || c.rotulo === "Potencial de aporte" ? c.cor : "text-texto"}`}>
              {brl(c.valor)}
            </span>
            <span className="truncate text-[11px] text-suave lg:text-xs">
              {"delta" in c && c.delta !== null && c.delta !== undefined ? (
                <>
                  <span className={`font-semibold ${(c.bom === "sobe" ? c.delta >= 0 : c.delta <= 0) ? "text-menta" : "text-erro"}`}>
                    {c.delta >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(c.delta))}%
                  </span>{" "}
                  vs. {nomeMes(somarMeses(p.mes, -1), true).toLowerCase()}
                </>
              ) : "detalhe" in c ? (
                c.detalhe
              ) : (
                "sem mês anterior"
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Fluxo de caixa + categorias */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <div className="painel flex min-w-0 flex-col gap-3 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-texto">Fluxo de caixa</h2>
            <p className="text-xs text-suave">Últimos 6 meses · o que entrou, o que saiu e quanto foi para a carteira</p>
          </div>
          <div className="h-64 w-full lg:h-72" role="img" aria-label={`Fluxo de caixa: em ${nomeMes(p.mes)}, receitas de ${brl0(p.resumo.receitas)} e despesas de ${brl0(p.resumo.despesas)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={p.serie} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="mes" tickFormatter={(m) => nomeMes(String(m), true)} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compacto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip
                  cursor={{ fill: tema.superficie2, opacity: 0.6 }}
                  labelFormatter={(m) => nomeMes(String(m))}
                  formatter={(v, n) => [brl(Number(v)), String(n)]}
                  contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto, fontSize: 13 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: tema.suave, paddingTop: 4 }} />
                <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={500} />
                <Bar dataKey="despesas" name="Despesas" fill="#F87171" radius={[6, 6, 0, 0]} maxBarSize={22} animationDuration={500} />
                <Line type="monotone" dataKey="reinvestido" name="Reinvestido" stroke="#FF8A3D" strokeWidth={2.5} dot={{ r: 3, fill: "#FF8A3D", strokeWidth: 0 }} animationDuration={500} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="painel flex min-w-0 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-texto">Para onde foi</h2>
              <p className="text-xs text-suave">Toque numa categoria para filtrar os lançamentos</p>
            </div>
            {filtroCategoria ? (
              <button type="button" onClick={() => setFiltroCategoria(null)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ciano hover:bg-superficie-2">
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Limpar
              </button>
            ) : null}
          </div>
          {porPrincipal.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porPrincipal}
                      dataKey="total"
                      nameKey="nome"
                      innerRadius="68%"
                      outerRadius="100%"
                      paddingAngle={2}
                      stroke="none"
                      animationDuration={500}
                      onClick={(_, i) => {
                        const id = porPrincipal[i]?.id;
                        if (id) setFiltroCategoria((f) => (f === id ? null : id));
                      }}
                      className="cursor-pointer outline-none"
                    >
                      {porPrincipal.map((x) => (
                        <Cell key={x.id} fill={x.cor} opacity={!filtroCategoria || filtroCategoria === x.id ? 1 : 0.25} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  {(() => {
                    const ativo = porPrincipal.find((x) => x.id === filtroCategoria);
                    return (
                      <>
                        <span className="max-w-[6.5rem] truncate text-[11px] text-suave">{ativo ? ativo.nome : "Despesas"}</span>
                        <span className="font-display text-base font-black tabular-nums text-texto">{brl0(ativo ? ativo.total : p.resumo.despesas)}</span>
                        {ativo && p.resumo.despesas > 0 ? <span className="text-[11px] text-suave">{Math.round((ativo.total / p.resumo.despesas) * 100)}%</span> : null}
                      </>
                    );
                  })()}
                </div>
              </div>
              <ul className="flex w-full min-w-0 flex-col gap-0.5">
                {porPrincipal.slice(0, 6).map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setFiltroCategoria((f) => (f === x.id ? null : x.id))}
                      aria-pressed={filtroCategoria === x.id}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${filtroCategoria === x.id ? "bg-superficie-2" : "hover:bg-superficie-2/60"} ${filtroCategoria && filtroCategoria !== x.id ? "opacity-50" : ""}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.cor }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-texto">{x.nome}</span>
                      <span className="tabular-nums text-suave">{brl0(x.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-suave">Nenhuma despesa neste mês.</p>
          )}
        </div>
      </div>

      {/* Orçamento do plano + meta */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="painel flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-texto">Orçamento do plano</h2>
              <p className="text-xs text-suave">{p.meta ? "Limites combinados para as categorias com corte" : "Crie uma meta para ganhar limites por categoria"}</p>
            </div>
          </div>
          {p.orcamento.length ? (
            <ul className="flex flex-col gap-3.5">
              {p.orcamento.map((o) => {
                const c = cat(o.categoriaId);
                const cor = o.estado === "estourou" ? "bg-erro" : o.estado === "atencao" ? "bg-gravata" : "bg-menta";
                return (
                  <li key={o.categoriaId} className="flex items-center gap-3">
                    {c ? <IconeCategoria icone={c.icone} cor={c.cor} tamanho={32} /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="truncate font-medium text-texto">{c?.nome ?? "Outros"}</span>
                        <span className="shrink-0 tabular-nums text-suave">
                          <span className={o.estado === "estourou" ? "font-semibold text-erro" : "text-texto"}>{brl0(o.gasto)}</span> / {brl0(o.limite)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-superficie-2" role="meter" aria-valuenow={Math.round(o.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${c?.nome}: ${Math.round(o.pct)}% do limite`}>
                        <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${Math.min(100, o.pct)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Link href="/financas/plano" className="flex items-center gap-3 rounded-xl border border-dashed border-linha p-4 text-sm text-suave transition hover:border-ciano hover:text-texto">
              <Target className="h-5 w-5 shrink-0 text-gravata" aria-hidden="true" />
              {p.meta ? "Seu plano atual não precisou de cortes: a sobra já cobre a meta." : "Diga quanto quer investir por mês e eu monto os limites e o diagnóstico dos seus gastos."}
            </Link>
          )}
        </div>

        <div className="painel flex flex-col gap-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-texto">{p.meta ? p.meta.nome : "Dinheiro livre para investir"}</h2>
            <p className="text-xs text-suave">{p.meta ? `${brl0(p.meta.valorMensal)} por mês para ${p.meta.destino}, durante ${p.meta.meses} meses` : "A sobra de cada mês aparece aqui quando houver uma meta"}</p>
          </div>
          {p.progresso && p.meta ? (
            <>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-black tabular-nums text-texto">{brl0(p.progresso.economizado)}</span>
                  <span className="text-xs tabular-nums text-suave">de {brl0(p.progresso.objetivo)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-superficie-2">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#2D5BFF,#FF8A3D)]" style={{ width: `${Math.max(2, p.progresso.pct)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-suave">
                  {Math.round(p.progresso.pct)}% · mês {p.progresso.mesesPassados} de {p.meta.meses}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-superficie-2/60 p-3">
                  <p className="text-[11px] text-suave">Já aportado</p>
                  <p className="font-display text-base font-bold tabular-nums text-texto">{brl0(p.progresso.aportado)}</p>
                </div>
                <div className="rounded-xl bg-gravata/10 p-3">
                  <p className="text-[11px] text-suave">Livre para aportar</p>
                  <p className="font-display text-base font-bold tabular-nums text-gravata">{brl0(p.progresso.livreParaAportar)}</p>
                </div>
              </div>
              {p.progresso.livreParaAportar >= 50 ? (
                <Link href="/carteira/adicionar" className="gradiente-marca flex h-11 items-center justify-center rounded-xl text-sm font-bold text-white hover:brightness-110">
                  Registrar aporte na carteira
                </Link>
              ) : null}
            </>
          ) : (
            <Link href="/financas/plano" className="gradiente-marca flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white hover:brightness-110">
              <Target className="h-4 w-4" aria-hidden="true" />
              Montar meu plano de aporte
            </Link>
          )}
        </div>
      </div>

      {/* Lançamentos */}
      <div className="painel flex flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-texto">Lançamentos</h2>
            <p className="text-xs text-suave">
              {lista.length} {lista.length === 1 ? "lançamento" : "lançamentos"}
              {filtroCategoria ? ` em ${cat(filtroCategoria)?.nome}` : ""} · toque para editar
            </p>
          </div>
          <div className="flex rounded-xl border border-linha bg-superficie-2 p-0.5" role="radiogroup" aria-label="Tipo">
            {(
              [
                ["todos", "Todos"],
                ["despesa", "Despesas"],
                ["receita", "Receitas"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={filtroTipo === id}
                onClick={() => setFiltroTipo(id)}
                className={`min-h-8 rounded-lg px-3 text-xs font-semibold ${filtroTipo === id ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        {lista.length ? (
          <ul>
            {[...porDia.entries()].map(([dia, itens]) => (
              <li key={dia}>
                <p className="flex items-center justify-between bg-superficie-2/40 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-suave">
                  <span>{dataCurta(dia, p.hoje)}</span>
                  <span className="tabular-nums normal-case tracking-normal">
                    {(() => {
                      const t = itens.reduce((s, o) => s + (o.tipo === "receita" ? o.valor : -o.valor), 0);
                      return `${t >= 0 ? "+" : "−"}${brl(Math.abs(t))}`;
                    })()}
                  </span>
                </p>
                <ul>
                  {itens.map((o) => {
                    const c = cat(o.categoriaId);
                    return (
                      <li key={`${o.id}-${o.data}`}>
                        <button type="button" onClick={() => editar(o)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-superficie-2/50">
                          <IconeCategoria icone={c?.icone ?? "Tag"} cor={c?.cor ?? "#94A3B8"} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-texto">{o.descricao}</span>
                            <span className="flex items-center gap-1.5 truncate text-xs text-suave">
                              {c?.nome ?? "Outros"}
                              {o.parcela ? <span className="rounded bg-superficie-2 px-1.5 py-px text-[10px] font-semibold">{o.parcela.atual}/{o.parcela.total}</span> : null}
                              {o.recorrente ? <Repeat className="h-3 w-3" aria-label="Recorrente" /> : null}
                              {o.origem === "exemplo" ? <span className="rounded bg-superficie-2 px-1.5 py-px text-[10px]">exemplo</span> : null}
                              {o.data > p.hoje ? <span className="rounded bg-ciano/10 px-1.5 py-px text-[10px] font-semibold text-ciano">previsto</span> : null}
                            </span>
                          </span>
                          <span className={`shrink-0 text-sm font-semibold tabular-nums ${o.tipo === "receita" ? "text-menta" : "text-texto"}`}>
                            {o.tipo === "receita" ? "+" : "−"}
                            {brl(o.valor)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <p className="text-sm text-suave">{ehMesAtual ? "Nada lançado com esse filtro neste mês." : "Nenhum lançamento com esse filtro."}</p>
            <button type="button" onClick={() => abrir("texto")} className="h-10 rounded-xl border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2">
              Lançar agora
            </button>
          </div>
        )}
      </div>

      {p.temExemplo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-linha px-4 py-3 text-sm text-suave">
          <span>Você está vendo lançamentos de exemplo, marcados como “exemplo”.</span>
          <BotaoExemploFinancas apagar />
        </div>
      ) : null}
    </section>
  );
}
