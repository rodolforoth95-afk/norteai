"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Landmark, LineChart as IconeLinha, Loader2, Plus, RotateCcw, ShoppingCart, Wallet } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SALDOS_INICIAIS, type Fotografia, type Operacao, type PosicaoAvaliada } from "@/lib/dominio/conta-simulada";
import { aplicarRendaFixaSimulada, comprarAtivo, criarContaSimulada, encerrarPosicaoSimulada, reiniciarContaSimulada } from "@/app/acoes-simulada";
import { useCoresTema } from "@/components/useCoresTema";
import { COR } from "@/components/paleta";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const dataCurta = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export function CriarContaSimulada() {
  const router = useRouter();
  const [saldo, setSaldo] = useState(SALDOS_INICIAIS[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="painel flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <span className="degrade-ativo flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
          <Wallet className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-texto">Abra sua conta simulada</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-suave">
            Você recebe um saldo fictício, compra ações, FIIs e ETFs pela cotação do dia ou aplica em renda fixa que rende pelo CDI. Todo dia o Findomo atualiza os números e compara com o CDI e o Ibovespa.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-suave">Saldo inicial</p>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {SALDOS_INICIAIS.map((v) => (
            <button key={v} type="button" onClick={() => setSaldo(v)} aria-pressed={saldo === v} className={`min-h-12 rounded-2xl border text-sm font-semibold transition ${saldo === v ? "degrade-ativo border-transparent text-white" : "border-linha text-texto hover:bg-superficie-2"}`}>
              {brl(v).replace(",00", "")}
            </button>
          ))}
        </div>
      </div>
      {erro ? <p className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro">{erro}</p> : null}
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await criarContaSimulada(saldo);
            if ("erro" in r) setErro(r.erro);
            else router.refresh();
          })
        }
        className="gradiente-marca flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white sm:w-fit sm:px-8"
      >
        {pendente ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        Criar conta simulada
      </button>
    </div>
  );
}

type Props = {
  conta: { criada_em: string; saldoInicial: number; caixa: number; operacoes: Operacao[]; historico: Fotografia[] };
  avaliacao: { posicoes: PosicaoAvaliada[]; investido: number; total: number; resultado: number; resultadoPct: number; cdiNoPeriodo: number };
  cdi: number;
  ibovPct: number | null;
};

export function ContaSimuladaPainel({ conta, avaliacao, cdi, ibovPct }: Props) {
  const router = useRouter();
  const tema = useCoresTema();
  const [aba, setAba] = useState<"bolsa" | "renda_fixa">("bolsa");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorRf, setValorRf] = useState("");
  const [pctCdi, setPctCdi] = useState(100);
  const [nomeRf, setNomeRf] = useState("CDB");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const cdiPct = (avaliacao.cdiNoPeriodo / conta.saldoInicial - 1) * 100;

  function executar(acao: () => Promise<{ ok: true } | { erro: string }>, limpar?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("erro" in r) setErro(r.erro);
      else {
        limpar?.();
        router.refresh();
      }
    });
  }

  const cards = [
    { rotulo: "Patrimônio simulado", valor: brl(avaliacao.total), extra: `desde ${dataCurta(conta.criada_em)}`, destaque: true },
    { rotulo: "Resultado", valor: pct(avaliacao.resultadoPct), extra: brl(avaliacao.resultado), cor: avaliacao.resultado >= 0 ? "text-menta" : "text-erro" },
    { rotulo: "CDI no período", valor: pct(cdiPct), extra: `${cdi.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ao ano` },
    { rotulo: "Ibovespa no período", valor: pct(ibovPct), extra: "desde a criação" },
  ];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.rotulo} className={`flex flex-col gap-1 rounded-[1.375rem] p-4 lg:p-5 ${c.destaque ? "degrade-ativo text-white" : "painel"}`}>
            <span className={`text-xs font-medium ${c.destaque ? "text-white/80" : "text-suave"}`}>{c.rotulo}</span>
            <span className={`truncate font-display text-xl font-semibold tabular-nums lg:text-2xl ${c.destaque ? "" : (c.cor ?? "text-texto")}`}>{c.valor}</span>
            <span className={`text-[11px] ${c.destaque ? "text-white/75" : "text-suave"}`}>{c.extra}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Linha do tempo */}
        <div className="painel flex min-w-0 flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <IconeLinha className="h-4 w-4 text-ciano" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-texto">Sua conta x CDI x Ibovespa</h2>
          </div>
          {conta.historico.length > 1 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conta.historico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="data" tickFormatter={dataCurta} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)} mil`} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={50} domain={["auto", "auto"]} />
                  <Tooltip labelFormatter={(d) => dataCurta(String(d))} formatter={(v, n) => [brl(Number(v)), String(n)]} contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto, fontSize: 13 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: tema.suave }} />
                  <Line type="monotone" dataKey="valor" name="Sua conta" stroke={COR.azul} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cdi" name="CDI" stroke={COR.laranja} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="ibov" name="Ibovespa" stroke={COR.ceu} strokeWidth={2} strokeDasharray="2 4" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-linha px-6 text-center text-sm text-suave">A linha do tempo começa amanhã: o Findomo tira uma foto da conta por dia.</p>
          )}
        </div>

        {/* Nova operação */}
        <div className="painel flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-texto">Nova operação</h2>
            <span className="text-xs text-suave">
              Caixa: <span className="font-semibold text-texto">{brl(conta.caixa)}</span>
            </span>
          </div>
          <div className="flex rounded-full border border-linha bg-superficie-2 p-1">
            {(
              [
                ["bolsa", "Bolsa", ShoppingCart],
                ["renda_fixa", "Renda fixa", Landmark],
              ] as const
            ).map(([id, rotulo, Icone]) => (
              <button key={id} type="button" onClick={() => setAba(id)} className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold ${aba === id ? "bg-superficie text-texto shadow" : "text-suave"}`}>
                <Icone className="h-3.5 w-3.5" aria-hidden="true" /> {rotulo}
              </button>
            ))}
          </div>
          {aba === "bolsa" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                executar(() => comprarAtivo({ codigo, quantidade: Number(quantidade) }), () => {
                  setCodigo("");
                  setQuantidade("");
                });
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Código (ex.: BOVA11)" maxLength={12} className="h-11 w-full min-w-0 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm uppercase text-texto outline-none placeholder:normal-case focus:border-ciano" aria-label="Código do ativo" />
                <input value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Qtd." className="h-11 w-full min-w-0 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm text-texto outline-none focus:border-ciano" aria-label="Quantidade" />
              </div>
              <button type="submit" disabled={pendente || !codigo || !quantidade} className="gradiente-marca flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-60">
                {pendente ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
                Comprar pela cotação de agora
              </button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const valor = Number(valorRf.replace(/\./g, "").replace(",", "."));
                executar(() => aplicarRendaFixaSimulada({ nome: nomeRf, valor, pctCdi }), () => setValorRf(""));
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <select value={nomeRf} onChange={(e) => setNomeRf(e.target.value)} className="h-11 rounded-xl border border-linha bg-superficie-2 px-3 text-sm text-texto" aria-label="Tipo">
                  {["CDB", "Tesouro Selic", "LCI/LCA", "Fundo DI"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <input value={valorRf} onChange={(e) => setValorRf(e.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" placeholder="Valor (R$)" className="h-11 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm text-texto outline-none focus:border-ciano" aria-label="Valor" />
              </div>
              <label className="flex flex-col gap-1 text-xs font-semibold text-suave">
                <span className="flex justify-between">
                  Rende <span className="text-texto">{pctCdi}% do CDI</span>
                </span>
                <input type="range" min={80} max={130} step={1} value={pctCdi} onChange={(e) => setPctCdi(Number(e.target.value))} className="accent-[var(--destaque)]" />
              </label>
              <button type="submit" disabled={pendente || !valorRf} className="gradiente-marca flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-60">
                {pendente ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Landmark className="h-4 w-4" aria-hidden="true" />}
                Aplicar
              </button>
            </form>
          )}
          {erro ? <p className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro">{erro}</p> : null}
        </div>
      </div>

      {/* Posições */}
      <div className="painel flex flex-col p-0">
        <div className="flex items-center justify-between border-b border-linha px-5 py-4">
          <h2 className="font-display text-base font-semibold text-texto">Posições</h2>
          <span className="text-xs text-suave">Investido: {brl(avaliacao.investido)}</span>
        </div>
        {avaliacao.posicoes.length ? (
          <ul className="divide-y divide-linha">
            {avaliacao.posicoes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.tipo === "bolsa" ? "bg-ciano/12 text-ciano" : "bg-gravata/12 text-gravata"}`}>
                  {p.tipo === "bolsa" ? <ShoppingCart className="h-4 w-4" aria-hidden="true" /> : <Landmark className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-texto">{p.tipo === "bolsa" ? p.codigo : `${p.nome} · ${p.pctCdi}% do CDI`}</span>
                  <span className="block text-xs text-suave">
                    {p.tipo === "bolsa" ? `${p.quantidade} un. · preço médio ${brl(p.precoMedio)}${p.precoAtual ? ` · agora ${brl(p.precoAtual)}` : ""}` : `aplicado ${brl(p.valorAplicado)} em ${dataCurta(p.aberta_em)}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-texto">{brl(p.valorAtual)}</span>
                  <span className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${p.resultado >= 0 ? "text-menta" : "text-erro"}`}>
                    {p.resultado >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                    {pct(p.resultadoPct)}
                  </span>
                </span>
                <button type="button" disabled={pendente} onClick={() => window.confirm(p.tipo === "bolsa" ? `Vender toda a posição de ${p.codigo}?` : "Resgatar esta aplicação?") && executar(() => encerrarPosicaoSimulada(p.id))} className="h-8 rounded-full border border-linha px-3 text-xs font-semibold text-texto hover:border-erro hover:text-erro">
                  {p.tipo === "bolsa" ? "Vender" : "Resgatar"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-suave">Nenhuma posição ainda. Faça a primeira operação ao lado.</p>
        )}
      </div>

      {conta.operacoes.length ? (
        <div className="painel flex flex-col p-0">
          <h2 className="border-b border-linha px-5 py-4 font-display text-base font-semibold text-texto">Últimas operações</h2>
          <ul className="divide-y divide-linha">
            {conta.operacoes.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium capitalize text-texto">{o.tipo}</span> <span className="text-suave">· {o.descricao}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-suave">
                  {dataCurta(o.data)} · <span className="font-semibold text-texto">{brl(o.valor)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" onClick={() => window.confirm("Apagar a conta simulada e começar de novo?") && executar(() => reiniciarContaSimulada())} className="flex w-fit items-center gap-1.5 text-xs font-semibold text-suave hover:text-erro">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Recomeçar a conta simulada
      </button>
    </div>
  );
}
