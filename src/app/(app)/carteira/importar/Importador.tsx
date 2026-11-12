"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Keyboard,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Botao } from "@/components/Botao";
import { CLASSES, ORDEM_CLASSES } from "@/lib/dominio/catalogo";
import { classificar, lerNumeroBR } from "@/lib/dominio/classificar";
import { formatarData, hojeBR, normalizarNome } from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";
import { confirmarImportacao } from "@/app/acoes-carteira";
import { AvisoErro, CampoData, ESTILO_CAMPO, brl, lerDinheiro, paraTextoDinheiro, sinalReais, tom, useAcao } from "../comum";

export type Existente = { id: string; nome: string; classe: Classe; saldo: number; quantidade: number | null; ultimaData: string | null };

type Origem = "pdf" | "planilha" | "imagem" | "manual";

type Linha = {
  chave: string;
  nome: string;
  classe: Classe | "";
  quantidade: string;
  valor: string;
  alvo: string; // "" = novo; id = atualiza um investimento existente
  ignorar: boolean;
  aplicado: string;
  resgatado: string;
  movimentos: boolean; // mostra os campos de aplicação/resgate
};

let contador = 0;
const novaLinha = (p: Partial<Linha> = {}): Linha => ({
  chave: `l${++contador}`,
  nome: "",
  classe: "",
  quantidade: "",
  valor: "",
  alvo: "",
  ignorar: false,
  aplicado: "",
  resgatado: "",
  movimentos: false,
  ...p,
});

function correspondente(existentes: Existente[], nome: string, usados: Set<string>) {
  const alvo = normalizarNome(nome);
  if (!alvo) return "";
  const livres = existentes.filter((e) => !usados.has(e.id));
  const exato = livres.find((e) => normalizarNome(e.nome) === alvo);
  if (exato) return exato.id;
  if (alvo.length < 6) return "";
  return livres.find((e) => {
    const n = normalizarNome(e.nome);
    return n.length >= 6 && (n.includes(alvo) || alvo.includes(n));
  })?.id ?? "";
}

const FONTES: { id: Origem; rotulo: string; detalhe: string; aceita: string; Icone: typeof FileText }[] = [
  { id: "pdf", rotulo: "Extrato em PDF", detalhe: "Posição da corretora, banco ou nota de corretagem", aceita: ".pdf", Icone: FileText },
  { id: "planilha", rotulo: "Planilha", detalhe: "Posição da B3 (Excel) ou CSV", aceita: ".xlsx,.xls,.csv", Icone: FileSpreadsheet },
  { id: "imagem", rotulo: "Foto ou print", detalhe: "Tela do app da corretora (lida pela IA)", aceita: ".png,.jpg,.jpeg,.webp", Icone: ImageIcon },
  { id: "manual", rotulo: "Digitar vários", detalhe: "Atualize saldos ou cadastre de uma vez", aceita: "", Icone: Keyboard },
];

export function Importador({ existentes, iaLigada }: { existentes: Existente[]; iaLigada: boolean }) {
  const router = useRouter();
  const idArquivo = useId();
  const [etapa, setEtapa] = useState<"fonte" | "revisar" | "pronto">("fonte");
  const [fonte, setFonte] = useState<(typeof FONTES)[number] | null>(null);
  const [origem, setOrigem] = useState<Origem>("manual");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [data, setData] = useState(hojeBR());
  const [dataSugerida, setDataSugerida] = useState<string | null>(null);
  const [ausentes, setAusentes] = useState<Record<string, "manter" | "zerar">>({});
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [instrucoes, setInstrucoes] = useState(false);
  const [resultado, setResultado] = useState<{ resumo: Record<string, number>; ganhos: string[] } | null>(null);
  const { executar, pendente, erro, setErro } = useAcao();

  function montarLinhas(lidas: { classe: Classe | null; codigo_ou_nome: string; quantidade: number | null; valor_atual: number | null }[]) {
    const usados = new Set<string>();
    return lidas.map((l) => {
      const alvo = correspondente(existentes, l.codigo_ou_nome, usados);
      if (alvo) usados.add(alvo);
      const existente = existentes.find((e) => e.id === alvo);
      return novaLinha({
        nome: l.codigo_ou_nome,
        classe: l.classe ?? existente?.classe ?? "",
        quantidade: l.quantidade === null ? "" : String(l.quantidade).replace(".", ","),
        valor: paraTextoDinheiro(l.valor_atual),
        alvo,
      });
    });
  }

  async function enviarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setAviso(null);
    setLendo(true);
    const form = new FormData();
    form.append("arquivo", arquivo);
    try {
      const r = await fetch("/api/carteira/importar", { method: "POST", body: form });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro ?? "Não foi possível ler o arquivo.");
      if (!dados.linhas.length) throw new Error("Não encontramos investimentos nesse arquivo. Confira se é o extrato de posição ou digite os valores.");
      setOrigem(dados.origem);
      setLinhas(montarLinhas(dados.linhas));
      if (dados.data) {
        setData(dados.data);
        setDataSugerida(dados.data);
      }
      if (dados.viaIA) setAviso("Lido pela IA. Confira nomes e valores com atenção antes de salvar.");
      setEtapa("revisar");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  function comecarManual() {
    setOrigem("manual");
    setErro(null);
    // Já traz os investimentos atuais para atualizar o saldo de todos de uma vez.
    setLinhas(
      existentes.filter((e) => e.saldo > 0).length
        ? existentes
            .filter((e) => e.saldo > 0)
            .map((e) =>
              novaLinha({ nome: e.nome, classe: e.classe, quantidade: e.quantidade === null ? "" : String(e.quantidade).replace(".", ","), valor: "", alvo: e.id }),
            )
        : [novaLinha()],
    );
    setEtapa("revisar");
  }

  function alterar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((ls) =>
      ls.map((l) => {
        if (l.chave !== chave) return l;
        const nova = { ...l, ...mudanca };
        if (mudanca.nome !== undefined && !l.classe) nova.classe = classificar(mudanca.nome) ?? "";
        if (mudanca.alvo) nova.classe = existentes.find((e) => e.id === mudanca.alvo)?.classe ?? nova.classe;
        return nova;
      }),
    );
  }

  const usados = new Set(linhas.filter((l) => !l.ignorar && l.alvo).map((l) => l.alvo));
  const naoVieram = existentes.filter((e) => e.saldo > 0 && !usados.has(e.id));
  const ativas = linhas.filter((l) => !l.ignorar && l.nome.trim() && l.valor.trim());
  // Linha de investimento existente com saldo em branco = sem atualização (fica como está).
  const faltaValor = (l: Linha) => (l.valor.trim() ? lerDinheiro(l.valor) === null : !l.alvo);
  const pendentes = linhas.filter((l) => !l.ignorar && l.nome.trim() && (!l.classe || faltaValor(l)));
  const dataFutura = data > hojeBR();

  // O que muda com esta importação.
  const resumo = useMemo(() => {
    let novos = 0;
    let atualizados = 0;
    let dinheiroNovo = 0;
    let rendimento = 0;
    let antes = existentes.reduce((s, e) => s + e.saldo, 0);
    let depois = antes;
    for (const l of linhas) {
      if (l.ignorar || !l.nome.trim()) continue;
      const valor = lerDinheiro(l.valor);
      if (valor === null) continue;
      if (!l.alvo) {
        novos++;
        dinheiroNovo += valor;
        depois += valor;
      } else {
        const e = existentes.find((x) => x.id === l.alvo);
        if (!e) continue;
        atualizados++;
        const ap = lerDinheiro(l.aplicado) ?? 0;
        const rs = lerDinheiro(l.resgatado) ?? 0;
        dinheiroNovo += ap - rs;
        rendimento += valor - e.saldo - ap + rs;
        depois += valor - e.saldo;
      }
    }
    let zerados = 0;
    for (const e of naoVieram) {
      if (ausentes[e.id] === "zerar") {
        zerados++;
        depois -= e.saldo;
        dinheiroNovo -= e.saldo;
      }
    }
    antes = Math.round(antes * 100) / 100;
    return { novos, atualizados, zerados, dinheiroNovo, rendimento, antes, depois };
  }, [linhas, existentes, naoVieram, ausentes]);

  function confirmar() {
    setErro(null);
    if (dataFutura) return setErro("A data do extrato não pode ser depois de hoje.");
    if (pendentes.length) return setErro("Complete a classe e o valor dos itens destacados (ou marque para ignorar).");
    const itens = ativas.map((l) => ({
      acao: (l.alvo ? "atualizar" : "novo") as "atualizar" | "novo",
      investimentoId: l.alvo || null,
      nome: l.nome.trim(),
      classe: l.classe as Classe,
      quantidade: l.quantidade.trim() ? lerNumeroBR(l.quantidade) : null,
      valor: lerDinheiro(l.valor) ?? 0,
      aplicado: lerDinheiro(l.aplicado) ?? 0,
      resgatado: lerDinheiro(l.resgatado) ?? 0,
    }));
    const listaAusentes = naoVieram.map((e) => ({ investimentoId: e.id, acao: ausentes[e.id] ?? ("manter" as const) }));
    executar(
      () => confirmarImportacao({ data, origem, itens, ausentes: listaAusentes }),
      (r) => {
        setResultado({ resumo: r.resumo ?? {}, ganhos: r.ganhos ?? [] });
        setEtapa("pronto");
      },
    );
  }

  // --- Etapa 3: pronto -------------------------------------------------------------
  if (etapa === "pronto" && resultado) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-menta/40 bg-menta/5 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-menta/20 text-menta">
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-display text-xl font-bold text-texto">Carteira atualizada em {formatarData(data)}</p>
        <p className="text-sm text-suave">
          {resultado.resumo.novos ?? 0} novos · {resultado.resumo.atualizados ?? 0} atualizados · {resultado.resumo.zerados ?? 0} zerados
        </p>
        {resultado.ganhos.length ? <p className="text-sm font-semibold text-ambar">{resultado.ganhos.join(" · ")}</p> : null}
        <Botao onClick={() => router.push("/carteira")}>Ver minha carteira</Botao>
      </div>
    );
  }

  // --- Etapa 1: escolher a fonte -----------------------------------------------------
  if (etapa === "fonte") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {FONTES.map((f) => {
            const desabilitada = f.id === "imagem" && !iaLigada;
            return (
              <button
                key={f.id}
                type="button"
                disabled={desabilitada}
                onClick={() => {
                  if (f.id === "manual") return comecarManual();
                  setFonte(f);
                  setErro(null);
                  setTimeout(() => document.getElementById(idArquivo)?.click(), 0);
                }}
                className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  fonte?.id === f.id ? "border-ciano bg-ciano/10" : "border-linha bg-superficie hover:border-ciano"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="gradiente-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                  <f.Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-texto">{f.rotulo}</span>
                  <span className="block text-xs text-suave">{desabilitada ? "Disponível quando a IA estiver ligada" : f.detalhe}</span>
                </span>
              </button>
            );
          })}
        </div>
        <input id={idArquivo} type="file" accept={fonte?.aceita || ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"} onChange={enviarArquivo} disabled={lendo} className="sr-only" />
        {lendo ? (
          <p className="flex items-center gap-2 rounded-2xl border border-linha bg-superficie px-4 py-3 text-sm text-texto" role="status">
            <Sparkles className="h-4 w-4 animate-pulse text-ciano" aria-hidden="true" />
            Lendo o arquivo…
          </p>
        ) : null}
        {erro ? <AvisoErro>{erro}</AvisoErro> : null}

        <Link href="/carteira/adicionar" className="flex items-center justify-between rounded-2xl border border-dashed border-linha px-4 py-3 text-sm text-suave hover:border-ciano hover:text-texto">
          Prefere cadastrar um investimento por vez, com a data da aplicação?
          <span className="font-semibold text-ciano">Adicionar</span>
        </Link>

        <p className="flex items-start gap-2 text-xs text-suave">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-menta" aria-hidden="true" />
          O arquivo é lido e descartado na hora. Guardamos só os investimentos que você confirmar. Antes de enviar um print, corte nome, CPF e número da conta.
        </p>

        <div className="rounded-2xl border border-linha bg-superficie/60">
          <button type="button" onClick={() => setInstrucoes((v) => !v)} aria-expanded={instrucoes} className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-medium text-texto">
            Como baixar a posição na B3
            <ChevronDown className={`h-5 w-5 transition ${instrucoes ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {instrucoes ? (
            <ol className="flex list-decimal flex-col gap-2 px-9 pb-4 text-sm text-suave">
              <li>Acesse a Área do Investidor da B3 (investidor.b3.com.br) com sua conta gov.br.</li>
              <li>Abra Extratos e depois Posição.</li>
              <li>Escolha a data de referência (a mais recente disponível).</li>
              <li>Toque em Baixar, formato Excel (.xlsx), e envie aqui.</li>
            </ol>
          ) : null}
        </div>
      </div>
    );
  }

  // --- Etapa 2: revisar ----------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => setEtapa("fonte")} className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Trocar arquivo
      </button>

      <div className="grid gap-4 rounded-2xl border border-linha bg-superficie p-5 sm:grid-cols-[1fr_1.2fr] sm:items-end">
        <CampoData
          rotulo="Data do extrato"
          valor={data}
          onChange={setData}
          ajuda={dataSugerida ? `Encontramos ${formatarData(dataSugerida)} no arquivo.` : "A data a que os saldos se referem. Hoje ou antes."}
        />
        <p className="text-sm text-suave">
          Os saldos serão registrados nesta data. Investimentos que já existem recebem uma <strong className="text-texto">atualização de saldo</strong>; os novos entram como{" "}
          <strong className="text-texto">aplicação</strong>.
        </p>
      </div>

      {aviso ? (
        <p className="flex items-start gap-2 rounded-2xl border border-ciano/40 bg-ciano/10 px-4 py-3 text-sm text-texto">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ciano" aria-hidden="true" />
          {aviso}
        </p>
      ) : null}

      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-texto">Confira cada investimento</h2>
          <p className="text-sm text-suave">
            {resumo.atualizados} já existem · {resumo.novos} novos
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {linhas.map((l) => {
          const existente = existentes.find((e) => e.id === l.alvo);
          const valor = lerDinheiro(l.valor);
          const ap = lerDinheiro(l.aplicado) ?? 0;
          const rs = lerDinheiro(l.resgatado) ?? 0;
          const rend = existente && valor !== null ? valor - existente.saldo - ap + rs : null;
          const incompleto = !l.ignorar && Boolean(l.nome.trim()) && (!l.classe || faltaValor(l));
          return (
            <li
              key={l.chave}
              className={`rounded-2xl border p-4 ${l.ignorar ? "border-linha opacity-50" : incompleto ? "border-ambar/60 bg-ambar/5" : "border-linha bg-superficie"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    l.ignorar ? "bg-superficie-2 text-suave" : existente ? "bg-ciano/15 text-ciano" : "bg-menta/15 text-menta"
                  }`}
                >
                  {l.ignorar ? "Ignorado" : existente ? "Atualiza" : "Novo"}
                </span>
                <input
                  value={l.nome}
                  onChange={(e) => alterar(l.chave, { nome: e.target.value })}
                  placeholder="Nome ou código"
                  aria-label="Nome ou código"
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 font-semibold text-texto hover:border-linha focus:border-ciano focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => alterar(l.chave, { ignorar: !l.ignorar })}
                  className="min-h-9 rounded-lg px-2 text-xs font-medium text-suave hover:text-texto"
                >
                  {l.ignorar ? "Incluir" : "Ignorar"}
                </button>
                {origem === "manual" && !existente ? (
                  <button type="button" onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} aria-label="Remover linha" className="flex h-9 w-9 items-center justify-center rounded-lg text-suave hover:text-erro">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {!l.ignorar ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="col-span-2 flex flex-col gap-1 text-[11px] text-suave sm:col-span-1">
                      Corresponde a
                      <select value={l.alvo} onChange={(e) => alterar(l.chave, { alvo: e.target.value })} className={`${ESTILO_CAMPO} min-h-11 text-sm`}>
                        <option value="">Novo investimento</option>
                        {existentes.map((e) => (
                          <option key={e.id} value={e.id} disabled={usados.has(e.id) && e.id !== l.alvo}>
                            {e.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] text-suave">
                      Classe
                      <select
                        value={l.classe}
                        onChange={(e) => alterar(l.chave, { classe: e.target.value as Classe })}
                        className={`${ESTILO_CAMPO} min-h-11 text-sm ${!l.classe ? "border-ambar" : ""}`}
                      >
                        <option value="">Escolha…</option>
                        {ORDEM_CLASSES.map((c) => (
                          <option key={c} value={c}>
                            {CLASSES[c].nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] text-suave">
                      Quantidade
                      <input
                        inputMode="decimal"
                        value={l.quantidade}
                        onChange={(e) => alterar(l.chave, { quantidade: e.target.value.replace(/[^\d.,]/g, "") })}
                        placeholder="—"
                        className={`${ESTILO_CAMPO} min-h-11 text-sm`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] text-suave">
                      Saldo na data (R$)
                      <input
                        inputMode="decimal"
                        value={l.valor}
                        onChange={(e) => alterar(l.chave, { valor: e.target.value.replace(/[^\d.,]/g, "") })}
                        placeholder={existente ? "Em branco = sem mudança" : "0,00"}
                        className={`${ESTILO_CAMPO} min-h-11 text-sm font-semibold ${l.nome && faltaValor(l) ? "border-ambar" : ""}`}
                      />
                    </label>
                  </div>

                  {existente ? (
                    <div className="mt-3 rounded-xl bg-superficie-2 px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-suave">
                          Antes: <span className="font-semibold text-texto">{brl(existente.saldo)}</span>
                          {existente.ultimaData ? ` em ${formatarData(existente.ultimaData)}` : ""}
                        </span>
                        {rend !== null ? (
                          <span className={`font-semibold ${tom(rend)}`}>
                            {rend >= 0 ? "Rendeu" : "Caiu"} {sinalReais(rend)}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => alterar(l.chave, { movimentos: !l.movimentos })}
                        aria-expanded={l.movimentos}
                        className="mt-1 inline-flex min-h-8 items-center gap-1 font-medium text-ciano"
                      >
                        Teve aplicação ou resgate desde então?
                        <ChevronDown className={`h-3.5 w-3.5 transition ${l.movimentos ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      {l.movimentos ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1 text-[11px] text-suave">
                            Apliquei (R$)
                            <input
                              inputMode="decimal"
                              value={l.aplicado}
                              onChange={(e) => alterar(l.chave, { aplicado: e.target.value.replace(/[^\d.,]/g, "") })}
                              placeholder="0,00"
                              className={`${ESTILO_CAMPO} min-h-10 text-sm`}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-suave">
                            Resgatei (R$)
                            <input
                              inputMode="decimal"
                              value={l.resgatado}
                              onChange={(e) => alterar(l.chave, { resgatado: e.target.value.replace(/[^\d.,]/g, "") })}
                              placeholder="0,00"
                              className={`${ESTILO_CAMPO} min-h-10 text-sm`}
                            />
                          </label>
                          <p className="col-span-2 text-[11px] text-suave">Assim o dinheiro novo não é contado como rendimento.</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setLinhas((ls) => [...ls, novaLinha()])}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-linha text-sm font-medium text-texto hover:border-ciano"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Adicionar linha
      </button>

      {naoVieram.length ? (
        <div className="rounded-2xl border border-ambar/40 bg-ambar/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-texto">
            <TriangleAlert className="h-4 w-4 text-ambar" aria-hidden="true" />
            {naoVieram.length === 1 ? "1 investimento não está" : `${naoVieram.length} investimentos não estão`} nesta importação
          </p>
          <p className="mt-1 text-sm text-suave">Se você resgatou tudo, marque “Zerar”. Se só não apareceu neste extrato (outra corretora, por exemplo), mantenha.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {naoVieram.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-superficie px-3 py-2">
                <span className="text-sm">
                  <span className="font-semibold text-texto">{e.nome}</span>
                  <span className="text-suave"> · {brl(e.saldo)}</span>
                </span>
                <span className="flex gap-1" role="radiogroup" aria-label={`O que fazer com ${e.nome}`}>
                  {(["manter", "zerar"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={(ausentes[e.id] ?? "manter") === a}
                      onClick={() => setAusentes((x) => ({ ...x, [e.id]: a }))}
                      className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${
                        (ausentes[e.id] ?? "manter") === a ? (a === "zerar" ? "border-erro bg-erro/15 text-erro" : "border-ciano bg-ciano/15 text-texto") : "border-linha text-suave"
                      }`}
                    >
                      {a === "manter" ? "Manter" : "Zerar"}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-linha bg-superficie p-5">
        <p className="font-display text-lg font-semibold text-texto">O que muda</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Patrimônio antes", brl(resumo.antes), "text-texto"],
            ["Patrimônio depois", brl(resumo.depois), "text-texto"],
            ["Dinheiro novo (líquido)", sinalReais(resumo.dinheiroNovo), tom(resumo.dinheiroNovo)],
            ["Rendimento do período", sinalReais(resumo.rendimento), tom(resumo.rendimento)],
          ].map(([r, v, c]) => (
            <div key={r} className="rounded-2xl bg-superficie-2 p-3">
              <dt className="text-[11px] text-suave">{r}</dt>
              <dd className={`font-display text-base font-bold ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-suave">
          {resumo.atualizados} atualizados · {resumo.novos} novos · {resumo.zerados} zerados
        </p>
      </div>

      {pendentes.length ? (
        <p className="flex items-start gap-2 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm text-ambar" role="status">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {pendentes.length === 1 ? "1 item precisa" : `${pendentes.length} itens precisam`} de classe ou saldo. Complete ou marque para ignorar.
        </p>
      ) : null}
      {erro ? <AvisoErro>{erro}</AvisoErro> : null}
      <Botao larguraTotal onClick={confirmar} carregando={pendente} disabled={dataFutura || (!ativas.length && !naoVieram.some((e) => ausentes[e.id] === "zerar"))}>
        Confirmar e salvar em {formatarData(data)}
      </Botao>
    </div>
  );
}
