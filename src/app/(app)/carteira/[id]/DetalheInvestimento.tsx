"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ExternalLink, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Botao } from "@/components/Botao";
import { Cartao, TituloSecao } from "@/components/ui";
import { useCoresTema } from "@/components/useCoresTema";
import { CLASSES, ORDEM_CLASSES } from "@/lib/dominio/catalogo";
import { extrairTicker } from "@/lib/dominio/classificar";
import { ROTULO_MOVIMENTACAO, ROTULO_ORIGEM, formatarData, hojeBR, diasEntre, DIAS_DESATUALIZADO, type EstadoInvestimento, type Movimentacao, type TipoMovimentacao } from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";
import { apagarInvestimento, apagarMovimentacao, editarInvestimento } from "@/app/acoes-carteira";
import { FormMovimentacao } from "../FormMovimentacao";
import { AvisoErro, AvisoGanhos, ESTILO_CAMPO, Janela, brl, brlCurto, lerDinheiro, nomeMesCurto, pct, sinalReais, tom, useAcao } from "../comum";

type Props = {
  investimento: { id: string; nome: string; classe: Classe; quantidade: number | null };
  estado: EstadoInvestimento;
  pctCarteira: number;
  serie: { mes: string; saldo: number; aplicado: number; rendimento: number }[];
  extrato: (Movimentacao & { saldoDepois: number })[];
};

const ICONE: Record<TipoMovimentacao, typeof RefreshCw> = { saldo: RefreshCw, aplicacao: ArrowUpCircle, resgate: ArrowDownCircle };

export function DetalheInvestimento({ investimento, estado, pctCarteira, serie, extrato }: Props) {
  const router = useRouter();
  const [janela, setJanela] = useState<{ tipo: "mov"; mov: TipoMovimentacao } | { tipo: "editar-mov"; mov: Movimentacao } | { tipo: "dados" } | { tipo: "excluir" } | null>(null);
  const [ganhos, setGanhos] = useState<string[]>([]);
  const acao = useAcao();
  const rendimento = estado.saldo - estado.aplicado;
  const rentab = estado.aplicado > 0.01 ? (estado.saldo / estado.aplicado - 1) * 100 : null;
  const ticker = extrairTicker(investimento.nome) === investimento.nome.toUpperCase() ? investimento.nome.toUpperCase() : null;
  const dias = estado.ultimaData ? diasEntre(estado.ultimaData, hojeBR()) : null;
  const dadosInv = { id: investimento.id, nome: investimento.nome, quantidade: investimento.quantidade, saldo: estado.saldo };

  function fechar(g: string[] = []) {
    setJanela(null);
    if (g.length) setGanhos(g);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-suave">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASSES[investimento.classe].cor }} aria-hidden="true" />
            {CLASSES[investimento.classe].nome}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-texto">{investimento.nome}</h1>
          <p className="mt-1 text-sm text-suave">
            {investimento.quantidade ? `${investimento.quantidade.toLocaleString("pt-BR")} un. · ` : ""}
            {pctCarteira.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da carteira
            {ticker ? (
              <>
                {" · "}
                <Link href={`/mercado/${ticker}`} className="inline-flex items-center gap-1 font-medium text-ciano">
                  Ver cotação <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Botao onClick={() => setJanela({ tipo: "mov", mov: "saldo" })} className="!min-h-11 !px-3 text-sm">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar saldo
          </Botao>
          <Botao variante="secundario" onClick={() => setJanela({ tipo: "mov", mov: "aplicacao" })} className="!min-h-11 !px-3 text-sm">
            <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
            Aplicar
          </Botao>
          <Botao variante="secundario" onClick={() => setJanela({ tipo: "mov", mov: "resgate" })} className="!min-h-11 !px-3 text-sm" disabled={estado.saldo <= 0}>
            <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
            Resgatar
          </Botao>
        </div>
      </header>

      <AvisoGanhos ganhos={ganhos} onFechar={() => setGanhos([])} />
      {dias !== null && dias > DIAS_DESATUALIZADO && estado.saldo > 0 ? (
        <p className="rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm text-ambar">
          Último registro há {dias} dias. Atualize o saldo para ver o rendimento real.
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Saldo atual", brl(estado.saldo), "text-texto"],
          ["Valor aplicado", brl(estado.aplicado), "text-texto"],
          ["Rendimento", sinalReais(rendimento), tom(rendimento)],
          ["Rentabilidade", pct(rentab), tom(rentab)],
        ].map(([r, v, c]) => (
          <div key={r} className="rounded-2xl border border-linha bg-superficie p-4">
            <dt className="text-xs text-suave">{r}</dt>
            <dd className={`mt-1 font-display text-xl font-bold tabular-nums ${c}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Cartao>
          <TituloSecao titulo="Evolução" subtitulo="Saldo no fim de cada mês e quanto foi aplicado" />
          {serie.length >= 2 ? <GraficoInvestimento serie={serie} /> : <p className="mt-3 text-sm text-suave">O gráfico aparece a partir do segundo mês de registros.</p>}
        </Cartao>
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Resumo" />
          <dl className="flex flex-col divide-y divide-linha text-sm">
            {[
              ["Total já aplicado", brl(estado.aplicadoTotal)],
              ["Total já resgatado", brl(estado.resgatadoTotal)],
              ["Movimentações", String(extrato.length)],
              ["Último registro", estado.ultimaData ? formatarData(estado.ultimaData) : "—"],
            ].map(([r, v]) => (
              <div key={r} className="flex justify-between py-2">
                <dt className="text-suave">{r}</dt>
                <dd className="font-medium text-texto">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setJanela({ tipo: "dados" })} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-linha text-sm font-medium text-texto hover:border-violeta">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar dados
            </button>
            <button type="button" onClick={() => setJanela({ tipo: "excluir" })} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-linha text-sm font-medium text-erro hover:border-erro">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir
            </button>
          </div>
        </Cartao>
      </div>

      <Cartao>
        <TituloSecao titulo="Extrato" subtitulo="Toque no lápis para corrigir uma movimentação" />
        {acao.erro ? <div className="mt-3"><AvisoErro>{acao.erro}</AvisoErro></div> : null}
        <ul className="mt-3 flex flex-col divide-y divide-linha">
          {extrato.map((m) => {
            const Icone = ICONE[m.tipo];
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    m.tipo === "aplicacao" ? "bg-menta/15 text-menta" : m.tipo === "resgate" ? "bg-erro/15 text-erro" : "bg-ciano/15 text-ciano"
                  }`}
                >
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-texto">{ROTULO_MOVIMENTACAO[m.tipo]}</span>
                  <span className="block text-xs text-suave">
                    {formatarData(m.data)} · {ROTULO_ORIGEM[m.origem]}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block font-semibold tabular-nums ${m.tipo === "aplicacao" ? "text-menta" : m.tipo === "resgate" ? "text-erro" : "text-texto"}`}>
                    {m.tipo === "aplicacao" ? "+" : m.tipo === "resgate" ? "−" : ""}
                    {brl(m.valor)}
                  </span>
                  <span className="block text-xs text-suave">saldo {brl(m.saldoDepois)}</span>
                </span>
                <span className="flex">
                  <button type="button" onClick={() => setJanela({ tipo: "editar-mov", mov: m })} aria-label={`Editar ${ROTULO_MOVIMENTACAO[m.tipo]} de ${formatarData(m.data)}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-suave hover:text-texto">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(extrato.length === 1 ? "Esta é a única movimentação. Excluir apaga o investimento. Continuar?" : "Excluir esta movimentação?")) {
                        acao.executar(() => apagarMovimentacao(investimento.id, m.id), () => {
                          if (extrato.length === 1) router.push("/carteira");
                        });
                      }
                    }}
                    aria-label={`Excluir ${ROTULO_MOVIMENTACAO[m.tipo]} de ${formatarData(m.data)}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-suave hover:text-erro"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </Cartao>

      {janela?.tipo === "mov" ? (
        <Janela titulo={investimento.nome} onFechar={() => fechar()}>
          <FormMovimentacao investimento={dadosInv} tipoInicial={janela.mov} onFeito={fechar} />
        </Janela>
      ) : null}
      {janela?.tipo === "editar-mov" ? (
        <Janela titulo="Corrigir movimentação" onFechar={() => fechar()}>
          <FormMovimentacao investimento={dadosInv} editando={janela.mov} onFeito={fechar} />
        </Janela>
      ) : null}
      {janela?.tipo === "dados" ? (
        <Janela titulo="Editar dados" onFechar={() => fechar()}>
          <FormDados investimento={investimento} onFeito={() => fechar()} />
        </Janela>
      ) : null}
      {janela?.tipo === "excluir" ? (
        <Janela titulo="Excluir investimento" onFechar={() => fechar()}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-texto">
              Isso apaga <strong>{investimento.nome}</strong> e todo o extrato dele, inclusive do histórico da carteira. Se você vendeu ou resgatou, prefira registrar um{" "}
              <strong>resgate</strong>: assim o histórico continua certo.
            </p>
            {acao.erro ? <AvisoErro>{acao.erro}</AvisoErro> : null}
            <Botao variante="secundario" onClick={() => setJanela({ tipo: "mov", mov: "resgate" })} disabled={estado.saldo <= 0}>
              Registrar resgate total
            </Botao>
            <Botao variante="perigo" carregando={acao.pendente} onClick={() => acao.executar(() => apagarInvestimento(investimento.id), () => router.push("/carteira"))}>
              Excluir mesmo assim
            </Botao>
          </div>
        </Janela>
      ) : null}
    </div>
  );
}

function FormDados({ investimento, onFeito }: { investimento: Props["investimento"]; onFeito: () => void }) {
  const [nome, setNome] = useState(investimento.nome);
  const [classe, setClasse] = useState<Classe>(investimento.classe);
  const [quantidade, setQuantidade] = useState(investimento.quantidade === null ? "" : String(investimento.quantidade).replace(".", ","));
  const { executar, pendente, erro } = useAcao();
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
        Nome ou código
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={ESTILO_CAMPO} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
        Classe
        <select value={classe} onChange={(e) => setClasse(e.target.value as Classe)} className={ESTILO_CAMPO}>
          {ORDEM_CLASSES.map((c) => (
            <option key={c} value={c}>
              {CLASSES[c].nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
        Quantidade atual
        <input inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="—" className={ESTILO_CAMPO} />
      </label>
      {erro ? <AvisoErro>{erro}</AvisoErro> : null}
      <Botao
        carregando={pendente}
        onClick={() =>
          executar(
            () => editarInvestimento({ id: investimento.id, nome: nome.trim(), classe, quantidade: quantidade.trim() ? lerDinheiro(quantidade) : null }),
            onFeito,
          )
        }
      >
        Salvar
      </Botao>
    </div>
  );
}

function GraficoInvestimento({ serie }: { serie: Props["serie"] }) {
  const tema = useCoresTema();
  return (
    <div className="mt-4 h-60 w-full" role="img" aria-label={`Evolução: ${serie.map((p) => `${nomeMesCurto(p.mes)} ${brl(p.saldo)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="area-inv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D5BFF" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2D5BFF" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={tema.linha} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="mes" tickFormatter={nomeMesCurto} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tickFormatter={(v) => brlCurto(Number(v))} tick={{ fill: tema.suave, fontSize: 11 }} axisLine={false} tickLine={false} width={62} domain={["auto", "auto"]} />
          <Tooltip
            labelFormatter={(m) => nomeMesCurto(String(m))}
            formatter={(v, n) => [brl(Number(v)), String(n)]}
            contentStyle={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 12, color: tema.texto }}
          />
          <Area type="monotone" dataKey="saldo" name="Saldo" stroke={tema.destaque} strokeWidth={2.5} fill="url(#area-inv)" />
          <Line type="stepAfter" dataKey="aplicado" name="Aplicado" stroke={tema.suave} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
