"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bitcoin, Building2, Check, CircleDollarSign, Globe2, Landmark, LineChart, PieChart, Search, Shapes, Wallet } from "lucide-react";
import { Botao } from "@/components/Botao";
import { CLASSES } from "@/lib/dominio/catalogo";
import { classificar, extrairTicker } from "@/lib/dominio/classificar";
import { hojeBR } from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";
import { salvarNovoInvestimento } from "@/app/acoes-carteira";
import { AvisoErro, AvisoGanhos, CampoData, CampoDinheiro, ESTILO_CAMPO, brl, lerDinheiro, useAcao } from "../comum";

type Tipo = {
  id: string;
  rotulo: string;
  detalhe: string;
  classe: Classe;
  Icone: typeof Landmark;
  bolsa?: boolean; // tem código de negociação e quantidade
  sugestoes?: string[];
  exemplo: string;
};

const TIPOS: Tipo[] = [
  { id: "tesouro", rotulo: "Tesouro Direto", detalhe: "Selic, IPCA+, Prefixado", classe: "renda_fixa", Icone: Landmark, exemplo: "Tesouro Selic 2029", sugestoes: ["Tesouro Selic 2029", "Tesouro Selic 2031", "Tesouro IPCA+ 2029", "Tesouro IPCA+ 2035", "Tesouro IPCA+ 2045", "Tesouro Prefixado 2027", "Tesouro Prefixado 2031", "Tesouro Renda+ 2065", "Tesouro Educa+ 2035"] },
  { id: "bancario", rotulo: "CDB, LCI ou LCA", detalhe: "Títulos de banco", classe: "renda_fixa", Icone: Building2, exemplo: "CDB Banco X 110% CDI", sugestoes: ["CDB 100% CDI", "CDB 110% CDI", "CDB prefixado", "CDB IPCA+", "LCI 90% CDI", "LCA 90% CDI", "LC", "RDB", "Poupança"] },
  { id: "credito", rotulo: "Debêntures, CRI e CRA", detalhe: "Crédito de empresas", classe: "renda_fixa", Icone: CircleDollarSign, exemplo: "Debênture Empresa X IPCA+ 2030", sugestoes: ["Debênture incentivada", "CRI", "CRA"] },
  { id: "acoes", rotulo: "Ações", detalhe: "Empresas da B3", classe: "acoes_etfs", Icone: LineChart, bolsa: true, exemplo: "PETR4" },
  { id: "fiis", rotulo: "Fundos imobiliários", detalhe: "FIIs na bolsa", classe: "fiis", Icone: Wallet, bolsa: true, exemplo: "HGLG11" },
  { id: "etfs", rotulo: "ETFs", detalhe: "Cestas de ativos", classe: "acoes_etfs", Icone: PieChart, bolsa: true, exemplo: "BOVA11" },
  { id: "exterior", rotulo: "Exterior e BDRs", detalhe: "Ativos de fora", classe: "exterior", Icone: Globe2, bolsa: true, exemplo: "IVVB11" },
  { id: "fundos", rotulo: "Fundos", detalhe: "Multimercado e outros", classe: "multimercado", Icone: Shapes, exemplo: "Fundo Multimercado X", sugestoes: ["Fundo multimercado", "Fundo de renda fixa", "Fundo de ações", "Previdência (PGBL/VGBL)"] },
  { id: "cripto", rotulo: "Criptomoedas", detalhe: "Bitcoin, Ethereum…", classe: "cripto", Icone: Bitcoin, exemplo: "Bitcoin", sugestoes: ["Bitcoin", "Ethereum", "Solana", "USDT", "HASH11", "QBTC11"] },
];

const PASSOS = ["Tipo", "Identificação", "Valores"];

export function FormNovoInvestimento() {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState<Classe>("renda_fixa");
  const [quantidade, setQuantidade] = useState("");
  const [data, setData] = useState(hojeBR());
  const [aplicado, setAplicado] = useState("");
  const [atual, setAtual] = useState("");
  const [salvo, setSalvo] = useState<string | null>(null);
  const { executar, pendente, erro, setErro, ganhos, limparGanhos } = useAcao();

  function escolher(t: Tipo) {
    setTipo(t);
    setClasse(t.classe);
    setNome("");
    setPasso(1);
  }

  function avancar() {
    setErro(null);
    if (passo === 1) {
      if (!nome.trim()) return setErro("Informe o nome ou o código do investimento.");
      setPasso(2);
    }
  }

  function salvar() {
    const valorAplicado = lerDinheiro(aplicado);
    const valorAtual = atual.trim() ? lerDinheiro(atual) : null;
    if (!valorAplicado || valorAplicado <= 0) return setErro("Informe quanto você aplicou.");
    if (data > hojeBR()) return setErro("A data da aplicação não pode ser depois de hoje.");
    executar(
      () =>
        salvarNovoInvestimento({
          nome: nome.trim(),
          classe,
          tipo: tipo?.id ?? null,
          quantidade: quantidade.trim() ? lerDinheiro(quantidade) : null,
          data,
          valorAplicado,
          valorAtual,
        }),
      (r) => setSalvo(r.id ?? null),
    );
  }

  function adicionarOutro() {
    setSalvo(null);
    setTipo(null);
    setNome("");
    setQuantidade("");
    setAplicado("");
    setAtual("");
    setData(hojeBR());
    setPasso(0);
    limparGanhos();
  }

  if (salvo) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-menta/40 bg-menta/5 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-menta/20 text-menta">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-display text-xl font-bold text-texto">{nome} foi adicionado</p>
        <AvisoGanhos ganhos={ganhos} onFechar={limparGanhos} />
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Botao larguraTotal onClick={adicionarOutro}>Adicionar outro investimento</Botao>
          <Link href={`/carteira/${salvo}`} className="flex min-h-12 items-center justify-center rounded-2xl border border-linha font-medium text-texto hover:border-violeta">
            Ver o investimento
          </Link>
          <button type="button" onClick={() => router.push("/carteira")} className="min-h-11 text-sm font-medium text-suave hover:text-texto">
            Voltar para a carteira
          </button>
        </div>
      </div>
    );
  }

  const valorAplicado = lerDinheiro(aplicado);
  const valorAtual = lerDinheiro(atual);

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-3 gap-2" aria-label="Etapas">
        {PASSOS.map((p, i) => (
          <li key={p} aria-current={i === passo ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= passo ? "gradiente-marca" : "bg-superficie-2"}`} />
            <span className={`text-xs font-semibold ${i === passo ? "text-texto" : "text-suave"}`}>
              {i + 1}. {p}
            </span>
          </li>
        ))}
      </ol>

      {passo === 0 ? (
        <div>
          <h2 className="font-display text-lg font-bold text-texto">O que você quer adicionar?</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => escolher(t)}
                className="flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border border-linha bg-superficie p-3 text-left transition hover:border-ciano"
              >
                <t.Icone className="h-6 w-6 text-ciano" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-texto">{t.rotulo}</span>
                  <span className="block text-xs text-suave">{t.detalhe}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {passo === 1 && tipo ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-texto">{tipo.rotulo}: qual investimento?</h2>
          {tipo.bolsa ? (
            <BuscaAtivo
              valor={nome}
              onChange={(v) => {
                setNome(v);
                const c = classificar(v);
                if (c) setClasse(c);
              }}
              exemplo={tipo.exemplo}
            />
          ) : (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
              Nome do investimento <span className="sr-only">obrigatório</span>
              <input
                list="sugestoes-tipo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={`Ex.: ${tipo.exemplo}`}
                className={ESTILO_CAMPO}
                autoFocus
              />
              <datalist id="sugestoes-tipo">
                {tipo.sugestoes?.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <span className="text-xs font-normal text-suave">Use um nome que você reconheça no extrato (com vencimento e taxa ajuda).</span>
            </label>
          )}
          {tipo.sugestoes && !tipo.bolsa ? (
            <div className="flex flex-wrap gap-1.5">
              {tipo.sugestoes.slice(0, 6).map((s) => (
                <button key={s} type="button" onClick={() => setNome(s)} className="min-h-9 rounded-full border border-linha px-3 text-xs text-suave hover:border-ciano hover:text-texto">
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
              Classe
              <select value={classe} onChange={(e) => setClasse(e.target.value as Classe)} className={ESTILO_CAMPO}>
                {(Object.keys(CLASSES) as Classe[]).map((c) => (
                  <option key={c} value={c}>
                    {CLASSES[c].nome}
                  </option>
                ))}
              </select>
            </label>
            {tipo.bolsa || tipo.id === "cripto" ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
                Quantidade
                <input
                  inputMode="decimal"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder={tipo.id === "cripto" ? "Ex.: 0,015" : "Ex.: 100"}
                  className={ESTILO_CAMPO}
                />
                <span className="text-xs font-normal text-suave">Com código e quantidade, o saldo pode ser atualizado pela cotação.</span>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}

      {passo === 2 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-texto">Quanto e quando?</h2>
          <CampoData rotulo="Data da aplicação" valor={data} onChange={setData} ajuda="Quando o dinheiro entrou. Pode ser uma data passada, nunca futura." />
          <CampoDinheiro rotulo="Valor aplicado" valor={aplicado} onChange={setAplicado} obrigatorio autoFocus ajuda="Quanto você investiu (sem rendimento)." />
          <CampoDinheiro
            rotulo="Quanto vale hoje (opcional)"
            valor={atual}
            onChange={setAtual}
            ajuda="Se já rendeu, informe o saldo atual do extrato. Em branco, consideramos o valor aplicado."
          />
          {valorAplicado && valorAtual ? (
            <p className={`rounded-xl px-3 py-2 text-sm ${valorAtual >= valorAplicado ? "bg-menta/10 text-menta" : "bg-erro/10 text-erro"}`}>
              {valorAtual >= valorAplicado ? "Rendimento" : "Queda"} de {brl(Math.abs(valorAtual - valorAplicado))} (
              {(((valorAtual - valorAplicado) / valorAplicado) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%).
            </p>
          ) : null}
          <div className="rounded-2xl bg-superficie-2 p-4 text-sm">
            <p className="font-semibold text-texto">{nome}</p>
            <p className="text-suave">
              {CLASSES[classe].nome}
              {quantidade ? ` · ${quantidade} un.` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {erro ? <AvisoErro>{erro}</AvisoErro> : null}

      {passo > 0 ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setPasso(passo - 1);
            }}
            className="flex min-h-12 items-center gap-2 rounded-2xl border border-linha px-4 font-medium text-texto hover:border-violeta"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          {passo === 1 ? (
            <Botao className="flex-1" onClick={avancar}>
              Continuar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Botao>
          ) : (
            <Botao className="flex-1" onClick={salvar} carregando={pendente}>
              Salvar investimento
            </Botao>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Busca de códigos da B3 (brapi), com digitação livre.
function BuscaAtivo({ valor, onChange, exemplo }: { valor: string; onChange: (v: string) => void; exemplo: string }) {
  const [resultados, setResultados] = useState<{ simbolo: string; nome: string; logo: string | null; preco: number | null }[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const q = valor.trim();
    if (q.length < 2 || extrairTicker(q) === q.toUpperCase()) {
      setResultados([]);
      return;
    }
    const controle = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/mercado/busca?q=${encodeURIComponent(q)}`, { signal: controle.signal });
        if (r.ok) setResultados((await r.json()).resultados ?? []);
      } catch {
        // busca opcional
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controle.abort();
    };
  }, [valor]);

  return (
    <div className="relative">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
        Código ou nome da empresa
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" aria-hidden="true" />
          <input
            value={valor}
            onChange={(e) => {
              onChange(e.target.value.toUpperCase());
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            placeholder={`Ex.: ${exemplo}`}
            className={`${ESTILO_CAMPO} pl-9 uppercase`}
            autoFocus
            autoComplete="off"
          />
        </span>
      </label>
      {aberto && resultados.length ? (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-linha bg-superficie shadow-xl">
          {resultados.map((r) => (
            <li key={r.simbolo}>
              <button
                type="button"
                onClick={() => {
                  onChange(r.simbolo);
                  setAberto(false);
                }}
                className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-superficie-2"
              >
                <span className="w-16 font-semibold text-texto">{r.simbolo}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-suave">{r.nome}</span>
                {r.preco ? <span className="text-sm text-texto">{brl(r.preco)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
