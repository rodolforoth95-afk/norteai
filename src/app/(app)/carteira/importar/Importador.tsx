"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ChangeEvent } from "react";
import { ChevronDown, FileSpreadsheet, FileText, Keyboard, Plus, ShieldCheck, Trash2, TriangleAlert, Upload } from "lucide-react";
import { Botao } from "@/components/Botao";
import { Alerta } from "@/components/Campo";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { CLASSES, ORDEM_CLASSES, TIPOS } from "@/lib/dominio/catalogo";
import { classificar, lerNumeroBR } from "@/lib/dominio/classificar";
import { formatarReais, percentuais } from "@/lib/dominio/motor";
import type { Classe } from "@/lib/dominio/tipos";
import { confirmarImportacao } from "@/app/acoes";

type Linha = {
  chave: string;
  classe: Classe | "";
  codigo_ou_nome: string;
  quantidade: string;
  valor: string;
};

type Origem = "b3" | "pdf" | "planilha" | "manual";

const SUGESTOES = [...new Set([
  ...TIPOS.map((t) => t.nome),
  "Tesouro Selic 2029",
  "Tesouro IPCA+ 2035",
  "Tesouro Prefixado 2028",
  "CDB pós-fixado",
  "LCI",
  "LCA",
  "BOVA11",
  "IVVB11",
  "SMAL11",
  "HASH11",
  "Bitcoin",
  "Ethereum",
])];

let contador = 0;
const novaLinha = (p: Partial<Linha> = {}): Linha => ({
  chave: `l${++contador}`,
  classe: "",
  codigo_ou_nome: "",
  quantidade: "",
  valor: "",
  ...p,
});

function paraTexto(n: number | null) {
  return n === null ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function Importador() {
  const router = useRouter();
  const [modo, setModo] = useState<"arquivo" | "manual">("arquivo");
  const [origem, setOrigem] = useState<Origem>("manual");
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [instrucoes, setInstrucoes] = useState(false);
  const [salvando, iniciar] = useTransition();
  const idArquivo = useId();

  async function enviarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setLendo(true);
    setNomeArquivo(arquivo.name);
    const form = new FormData();
    form.append("arquivo", arquivo);
    try {
      const r = await fetch("/api/carteira/importar", { method: "POST", body: form });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro ?? "Não foi possível ler o arquivo.");
      if (!dados.linhas.length) throw new Error("Não encontramos investimentos nesse arquivo. Confira se é o extrato de posição ou digite manualmente.");
      setOrigem(dados.origem);
      setLinhas(
        dados.linhas.map((l: { classe: Classe | null; codigo_ou_nome: string; quantidade: number | null; valor_atual: number | null }) =>
          novaLinha({ classe: l.classe ?? "", codigo_ou_nome: l.codigo_ou_nome, quantidade: paraTexto(l.quantidade), valor: paraTexto(l.valor_atual) }),
        ),
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  function comecarManual() {
    setModo("manual");
    setOrigem("manual");
    setErro(null);
    setLinhas((l) => l ?? [novaLinha()]);
  }

  function alterar(chave: string, campo: keyof Linha, valor: string) {
    setLinhas((ls) =>
      (ls ?? []).map((l) => {
        if (l.chave !== chave) return l;
        const nova = { ...l, [campo]: valor };
        // Autoclassificação ao digitar o nome, se a classe ainda não foi escolhida.
        if (campo === "codigo_ou_nome" && !l.classe) nova.classe = classificar(valor) ?? "";
        return nova;
      }),
    );
  }

  const validas = (linhas ?? []).map((l) => ({ ...l, num: lerNumeroBR(l.valor) }));
  const porClasse = Object.fromEntries(ORDEM_CLASSES.map((c) => [c, 0])) as Record<Classe, number>;
  for (const l of validas) if (l.classe && l.num) porClasse[l.classe] += l.num;
  const { total, pct } = percentuais(porClasse);
  const pendentes = validas.filter((l) => l.codigo_ou_nome.trim() && (!l.classe || !l.num || l.num <= 0)).length;

  function confirmar() {
    setErro(null);
    const posicoes = validas
      .filter((l) => l.codigo_ou_nome.trim())
      .map((l) => ({
        classe: l.classe as Classe,
        codigo_ou_nome: l.codigo_ou_nome.trim(),
        quantidade: l.quantidade ? lerNumeroBR(l.quantidade) : null,
        valor_atual: l.num ?? 0,
        data_referencia: data || null,
      }));
    iniciar(async () => {
      const r = await confirmarImportacao({ origem, posicoes });
      if ("erro" in r && r.erro) return setErro(r.erro);
      const ganhos = "ganhos" in r && r.ganhos?.length ? `?ganhos=${encodeURIComponent(r.ganhos.join(" · "))}` : "";
      router.push(`/carteira${ganhos}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-linha bg-superficie p-1" role="tablist" aria-label="Forma de importar">
        {(
          [
            ["arquivo", "Enviar arquivo", Upload],
            ["manual", "Digitar", Keyboard],
          ] as const
        ).map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={modo === id}
            onClick={() => (id === "manual" ? comecarManual() : setModo("arquivo"))}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium ${modo === id ? "gradiente-marca text-black" : "text-suave"}`}
          >
            <Icone className="h-4 w-4" aria-hidden="true" />
            {rotulo}
          </button>
        ))}
      </div>

      {modo === "arquivo" ? (
        <div className="flex flex-col gap-4">
          <label
            htmlFor={idArquivo}
            className="borda-gradiente flex cursor-pointer flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center transition hover:brightness-110"
          >
            <span className="gradiente-marca flex h-14 w-14 items-center justify-center rounded-2xl">
              <Upload className="h-7 w-7 text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold text-texto">{lendo ? "Lendo arquivo…" : "Escolher arquivo"}</span>
            <span className="text-sm text-suave">PDF (extrato ou nota de corretagem), XLSX ou CSV · até 5 MB</span>
            <span className="flex gap-4 text-xs text-suave">
              <span className="flex items-center gap-1"><FileText className="h-4 w-4" aria-hidden="true" />PDF</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" aria-hidden="true" />Planilha B3</span>
            </span>
            {nomeArquivo && !lendo ? <span className="text-xs text-ciano">{nomeArquivo}</span> : null}
          </label>
          <input id={idArquivo} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={enviarArquivo} disabled={lendo} className="sr-only" />

          <p className="flex items-start gap-2 text-xs text-suave">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-menta" aria-hidden="true" />
            O arquivo é lido e descartado na hora. Guardamos só os investimentos que você confirmar.
          </p>

          <div className="rounded-2xl border border-linha bg-superficie/60">
            <button type="button" onClick={() => setInstrucoes((v) => !v)} aria-expanded={instrucoes} className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-medium text-texto">
              Como exportar a planilha da B3
              <ChevronDown className={`h-5 w-5 transition ${instrucoes ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {instrucoes ? (
              <ol className="flex list-decimal flex-col gap-2 px-9 pb-4 text-sm text-suave">
                <li>Acesse a Área do Investidor da B3 (investidor.b3.com.br) e entre com sua conta gov.br ou CPF e senha.</li>
                <li>No menu, abra Extratos e depois Posição.</li>
                <li>Escolha a data de referência mais recente.</li>
                <li>Toque em Baixar e escolha o formato Excel (.xlsx).</li>
                <li>Volte aqui e envie o arquivo.</li>
              </ol>
            ) : null}
          </div>
        </div>
      ) : null}

      {erro ? <Alerta>{erro}</Alerta> : null}

      {linhas ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-texto">{modo === "manual" ? "Seus investimentos" : "Revise antes de salvar"}</h2>
              <p className="text-sm text-suave">{linhas.length} {linhas.length === 1 ? "item" : "itens"}</p>
            </div>
            <label className="flex flex-col text-xs text-suave">
              Data de referência
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 min-h-11 rounded-xl border border-linha bg-superficie px-2 text-sm text-texto" />
            </label>
          </div>

          {pendentes > 0 ? (
            <p className="flex items-start gap-2 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm text-ambar" role="status">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {pendentes === 1 ? "1 item precisa" : `${pendentes} itens precisam`} de classe ou valor. Eles estão destacados.
            </p>
          ) : null}

          <datalist id="sugestoes-ativos">
            {SUGESTOES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <ul className="flex flex-col gap-3">
            {validas.map((l, i) => {
              const incompleto = Boolean(l.codigo_ou_nome.trim()) && (!l.classe || !l.num);
              return (
                <li key={l.chave} className={`rounded-3xl border p-4 ${incompleto ? "border-ambar/60 bg-ambar/5" : "border-linha bg-superficie/80"}`}>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`${l.chave}-nome`}>Nome ou código do investimento {i + 1}</label>
                    <input
                      id={`${l.chave}-nome`}
                      list="sugestoes-ativos"
                      value={l.codigo_ou_nome}
                      onChange={(e) => alterar(l.chave, "codigo_ou_nome", e.target.value)}
                      placeholder="Nome ou código (ex.: Tesouro Selic, BOVA11)"
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-linha bg-superficie-2 px-3 text-sm font-medium text-texto placeholder:text-suave/70 focus:border-violeta focus:outline-none"
                    />
                    <button type="button" onClick={() => setLinhas((ls) => (ls ?? []).filter((x) => x.chave !== l.chave))} aria-label={`Remover ${l.codigo_ou_nome || "item"}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-suave hover:text-erro">
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[1.4fr_0.8fr_1fr] gap-2">
                    <label className="flex min-w-0 flex-col text-[11px] text-suave">
                      Classe
                      <select value={l.classe} onChange={(e) => alterar(l.chave, "classe", e.target.value)} className={`mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-superficie-2 px-2 text-sm text-texto ${!l.classe ? "border-ambar" : "border-linha"}`}>
                        <option value="">Escolha…</option>
                        {ORDEM_CLASSES.map((c) => (
                          <option key={c} value={c}>{CLASSES[c].nome}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-0 flex-col text-[11px] text-suave">
                      Qtd.
                      <input inputMode="decimal" value={l.quantidade} onChange={(e) => alterar(l.chave, "quantidade", e.target.value)} placeholder="—" className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-linha bg-superficie-2 px-2 text-sm text-texto" />
                    </label>
                    <label className="flex min-w-0 flex-col text-[11px] text-suave">
                      Valor atual (R$)
                      <input inputMode="decimal" value={l.valor} onChange={(e) => alterar(l.chave, "valor", e.target.value)} placeholder="0,00" className={`mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-superficie-2 px-2 text-sm text-texto ${l.codigo_ou_nome && !l.num ? "border-ambar" : "border-linha"}`} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          <Botao variante="secundario" onClick={() => setLinhas((ls) => [...(ls ?? []), novaLinha()])}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar investimento
          </Botao>

          {total > 0 ? (
            <div className="rounded-3xl border border-linha bg-superficie/80 p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-suave">Total</span>
                <span className="font-display text-2xl font-bold text-texto">{formatarReais(total)}</span>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-superficie-2">
                {ORDEM_CLASSES.filter((c) => porClasse[c] > 0).map((c) => (
                  <span key={c} style={{ width: `${pct[c]}%`, background: CLASSES[c].cor }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {ORDEM_CLASSES.filter((c) => porClasse[c] > 0).map((c) => (
                  <li key={c} className="flex justify-between">
                    <span className="flex items-center gap-2 text-suave">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASSES[c].cor }} aria-hidden="true" />
                      {CLASSES[c].nome}
                    </span>
                    <span className="text-texto">{formatarReais(porClasse[c])} · {pct[c].toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Botao larguraTotal onClick={confirmar} carregando={salvando} disabled={pendentes > 0 || total <= 0}>
            Confirmar importação
          </Botao>
        </div>
      ) : null}

      <AvisoEducacional />
    </div>
  );
}
