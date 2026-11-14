"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Repeat,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  sugerirCategoria,
  type Categoria,
  type Meio,
  type Regra,
  type TipoLancamento,
} from "@/lib/dominio/financas";
import { excluirLancamento, salvarLancamento } from "@/app/acoes-financas";
import { IconeCategoria } from "./IconeCategoria";
import { MEIOS, brl, lerValor, valorParaTexto } from "./formato";

export type ItemHistorico = {
  descricao: string;
  estabelecimento: string | null;
  categoriaId: string;
  tipo: TipoLancamento;
  meio: Meio | null;
  valor: number;
  usos: number;
};

export type ValoresLancamento = {
  id?: string;
  tipo: TipoLancamento;
  valor: number | null;
  data: string;
  descricao: string;
  estabelecimento: string | null;
  categoriaId: string | null;
  meio: Meio | null;
  parcelas: number;
  recorrente: boolean;
  origem: "manual" | "foto" | "audio";
  parcela?: { atual: number; total: number } | null;
};

export type ContextoLancamento = {
  categorias: Categoria[];
  regras: Regra[];
  historico: ItemHistorico[];
  hoje: string;
};

function deslocar(hoje: string, dias: number) {
  const d = new Date(`${hoje}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Formulário inteligente: autocompleta pelo histórico, sugere a categoria (regras aprendidas
// primeiro), aceita parcelas no crédito e recorrência mensal. Serve para incluir e editar.
export function FormLancamento({
  contexto,
  inicial,
  destaque,
  aoSalvar,
}: {
  contexto: ContextoLancamento;
  inicial: ValoresLancamento;
  destaque?: { titulo: string; texto: string } | null;
  aoSalvar: (mensagem: string) => void;
}) {
  const { categorias, regras, historico, hoje } = contexto;
  const [tipo, setTipo] = useState<TipoLancamento>(inicial.tipo);
  const [valorTexto, setValorTexto] = useState(valorParaTexto(inicial.valor));
  const [descricao, setDescricao] = useState(inicial.descricao);
  const [estabelecimento, setEstabelecimento] = useState(
    inicial.estabelecimento,
  );
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<string | null>(
    inicial.categoriaId,
  );
  const [data, setData] = useState(inicial.data);
  const [meio, setMeio] = useState<Meio | null>(inicial.meio);
  const [parcelas, setParcelas] = useState(inicial.parcelas);
  const [recorrente, setRecorrente] = useState(inicial.recorrente);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [serie, setSerie] = useState(false);
  const campoValor = useRef<HTMLInputElement>(null);
  const editando = Boolean(inicial.id);

  const doTipo = categorias.filter((c) => c.tipo === tipo);
  const sugestao = useMemo(
    () =>
      descricao.trim().length >= 2
        ? sugerirCategoria(`${estabelecimento ?? ""} ${descricao}`, tipo, {
            regras,
            categorias,
          })
        : null,
    [descricao, estabelecimento, tipo, regras, categorias],
  );
  const categoriaId =
    categoriaEscolhida && doTipo.some((c) => c.id === categoriaEscolhida)
      ? categoriaEscolhida
      : (sugestao?.categoriaId ?? null);
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null;

  const termo = descricao.trim().toLowerCase();
  const sugestoes =
    termo.length >= 1
      ? historico
          .filter(
            (h) =>
              h.tipo === tipo &&
              h.descricao.toLowerCase().includes(termo) &&
              h.descricao.toLowerCase() !== termo,
          )
          .slice(0, 5)
      : [];

  // Categorias em ordem: a sugerida primeiro, depois as mais usadas no histórico.
  const usos = new Map<string, number>();
  for (const h of historico)
    usos.set(h.categoriaId, (usos.get(h.categoriaId) ?? 0) + h.usos);
  const principais = doTipo
    .filter((c) => !c.paiId)
    .sort(
      (a, b) =>
        (b.id === categoriaId ? 1 : 0) - (a.id === categoriaId ? 1 : 0) ||
        (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0),
    );
  const subcategorias = categoria
    ? doTipo.filter((c) => c.paiId === (categoria.paiId ?? categoria.id))
    : [];

  const valor = lerValor(valorTexto);
  const dataEhOutra = data !== hoje && data !== deslocar(hoje, -1);

  function escolherHistorico(h: ItemHistorico) {
    setDescricao(h.descricao);
    setEstabelecimento(h.estabelecimento);
    setCategoriaEscolhida(h.categoriaId);
    if (h.meio) setMeio(h.meio);
    if (!valorTexto) setValorTexto(valorParaTexto(h.valor));
    setMostrarSugestoes(false);
    campoValor.current?.focus();
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!valor) return setErro("Informe o valor.");
    if (!descricao.trim()) return setErro("Diga do que se trata.");
    if (!categoriaId) return setErro("Escolha a categoria.");
    setSalvando(true);
    const r = await salvarLancamento({
      id: inicial.id,
      tipo,
      valor,
      data,
      descricao: descricao.trim(),
      estabelecimento:
        estabelecimento?.trim() ||
        (inicial.origem !== "manual" ? null : descricao.trim()),
      categoriaId,
      meio,
      parcelas: editando
        ? 1
        : meio === "credito" && tipo === "despesa"
          ? parcelas
          : 1,
      recorrente: parcelas > 1 && !editando ? false : recorrente,
      origem: inicial.origem,
      serie,
    });
    setSalvando(false);
    if ("erro" in r) return setErro(r.erro);
    const nome = categoria?.nome ?? "";
    aoSalvar(
      editando
        ? "Lançamento atualizado."
        : (r.quantidade ?? 1) > 1
          ? `${descricao.trim()} em ${r.quantidade}x de ${brl(valor / (r.quantidade ?? 1))} · ${nome}`
          : `${descricao.trim()} · ${brl(valor)} em ${nome}`,
    );
  }

  async function excluir() {
    if (!inicial.id) return;
    const temSerie = Boolean(inicial.parcela);
    if (
      !window.confirm(
        temSerie && serie
          ? "Excluir todas as parcelas desta compra?"
          : "Excluir este lançamento?",
      )
    )
      return;
    setSalvando(true);
    const r = await excluirLancamento(inicial.id, serie ? "serie" : "este");
    setSalvando(false);
    if ("erro" in r) return setErro(r.erro);
    aoSalvar("Lançamento excluído.");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5">
      {destaque ? (
        <div className="flex items-start gap-3 rounded-2xl border border-ciano/30 bg-ciano/8 p-3.5">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-ciano"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-semibold text-texto">{destaque.titulo}</p>
            <p className="mt-0.5 text-suave">{destaque.texto}</p>
          </div>
        </div>
      ) : null}

      {/* Tipo e valor */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex rounded-full border border-linha bg-superficie-2 p-1"
          role="radiogroup"
          aria-label="Tipo"
        >
          {(["despesa", "receita"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => {
                setTipo(t);
                setCategoriaEscolhida(null);
              }}
              className={`min-h-9 min-w-24 rounded-full px-4 text-sm font-semibold transition ${tipo === t ? (t === "despesa" ? "bg-superficie text-erro shadow" : "bg-superficie text-menta shadow") : "text-suave hover:text-texto"}`}
            >
              {t === "despesa" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>
        <label className="flex w-full items-baseline justify-center gap-2">
          <span className="font-display text-2xl font-bold text-suave">R$</span>
          <input
            ref={campoValor}
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor"
            autoFocus={!inicial.valor}
            className={`w-full max-w-[14rem] bg-transparent text-center font-display text-[2.6rem] font-bold tabular-nums tracking-tight outline-none placeholder:text-linha ${tipo === "despesa" ? "text-texto" : "text-menta"}`}
          />
        </label>
        {meio === "credito" && tipo === "despesa" && parcelas > 1 && valor ? (
          <p className="-mt-2 text-xs text-suave">
            {parcelas}x de {brl(valor / parcelas)} a partir de{" "}
            {data.slice(8, 10)}/{data.slice(5, 7)}
          </p>
        ) : null}
      </div>

      {/* Descrição com autocompletar */}
      <div className="relative">
        <label
          htmlFor="fin-descricao"
          className="mb-1.5 block text-xs font-semibold text-suave"
        >
          Descrição ou estabelecimento
        </label>
        <input
          id="fin-descricao"
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            setEstabelecimento(null);
            setMostrarSugestoes(true);
          }}
          onFocus={() => setMostrarSugestoes(true)}
          onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
          maxLength={60}
          autoComplete="off"
          placeholder={
            tipo === "despesa"
              ? "Ex.: iFood, Posto Ipiranga, Aluguel"
              : "Ex.: Salário, Dividendos, Freela"
          }
          className="h-12 w-full rounded-xl border border-linha bg-superficie-2 px-3.5 text-[15px] text-texto outline-none transition placeholder:text-suave/70 focus:border-ciano"
        />
        {mostrarSugestoes && sugestoes.length ? (
          <ul
            className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-linha bg-superficie shadow-[0_18px_40px_-16px_rgb(0_0_0/0.45)]"
            role="listbox"
          >
            {sugestoes.map((h) => {
              const cat = categorias.find((c) => c.id === h.categoriaId);
              return (
                <li key={`${h.descricao}-${h.categoriaId}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => escolherHistorico(h)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-superficie-2"
                  >
                    {cat ? (
                      <IconeCategoria
                        icone={cat.icone}
                        cor={cat.cor}
                        tamanho={28}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate font-medium text-texto">
                      {h.descricao}
                    </span>
                    <span className="text-xs tabular-nums text-suave">
                      {brl(h.valor)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {/* Categoria */}
      <div>
        <p className="mb-1.5 flex items-center justify-between text-xs font-semibold text-suave">
          Categoria
          {sugestao && !categoriaEscolhida ? (
            <span className="flex items-center gap-1 font-medium text-ciano">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {sugestao.aprendida ? "Você costuma usar esta" : "Sugerida"}
            </span>
          ) : null}
        </p>
        <div
          className="-mx-1 flex flex-wrap gap-1.5 px-1"
          role="radiogroup"
          aria-label="Categoria"
        >
          {principais.map((c) => {
            const ativa = c.id === categoriaId || c.id === categoria?.paiId;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => setCategoriaEscolhida(c.id)}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] font-medium transition ${ativa ? "border-transparent text-texto" : "border-linha text-suave hover:text-texto"}`}
                style={
                  ativa
                    ? {
                        background: `${c.cor}26`,
                        boxShadow: `inset 0 0 0 1.5px ${c.cor}`,
                      }
                    : undefined
                }
              >
                <IconeCategoria icone={c.icone} cor={c.cor} tamanho={26} />
                {c.nome}
              </button>
            );
          })}
        </div>
        {subcategorias.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5 border-l-2 border-linha pl-3">
            {subcategorias.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setCategoriaEscolhida(
                    s.id === categoriaId ? (s.paiId ?? s.id) : s.id,
                  )
                }
                className={`min-h-8 rounded-full border px-3 text-xs font-medium ${s.id === categoriaId ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
              >
                {s.nome}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Data e meio */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-suave">Data</p>
          <div className="flex gap-1.5">
            {[
              { rotulo: "Hoje", valor: hoje },
              { rotulo: "Ontem", valor: deslocar(hoje, -1) },
            ].map((o) => (
              <button
                key={o.rotulo}
                type="button"
                onClick={() => setData(o.valor)}
                className={`min-h-10 flex-1 rounded-xl border text-sm font-medium ${data === o.valor ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
              >
                {o.rotulo}
              </button>
            ))}
            <label
              className={`relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium ${dataEhOutra ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {dataEhOutra
                ? `${data.slice(8, 10)}/${data.slice(5, 7)}`
                : "Outra"}
              <input
                type="date"
                value={data}
                max={recorrente || parcelas > 1 ? undefined : hoje}
                onChange={(e) => e.target.value && setData(e.target.value)}
                className="absolute inset-0 opacity-0"
                aria-label="Escolher data"
              />
            </label>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-suave">Como pagou</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MEIOS.slice(0, tipo === "despesa" ? 6 : 6).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMeio(meio === m.id ? null : m.id)}
                className={`min-h-10 truncate rounded-xl border px-1 text-[13px] font-medium ${meio === m.id ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parcelas e recorrência */}
      {!editando ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-linha bg-superficie-2/50 p-3.5">
          {meio === "credito" && tipo === "despesa" ? (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-texto">Parcelas</span>
              <select
                value={parcelas}
                onChange={(e) => {
                  setParcelas(Number(e.target.value));
                  if (Number(e.target.value) > 1) setRecorrente(false);
                }}
                className="h-10 rounded-xl border border-linha bg-superficie px-3 text-sm text-texto"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "À vista" : `${n}x`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label
            className={`flex items-center justify-between gap-3 text-sm ${parcelas > 1 ? "opacity-40" : ""}`}
          >
            <span className="flex items-center gap-2 font-medium text-texto">
              <Repeat className="h-4 w-4 text-suave" aria-hidden="true" />
              Repete todo mês
              <span className="hidden text-xs font-normal text-suave sm:inline">
                aluguel, salário, assinaturas
              </span>
            </span>
            <input
              type="checkbox"
              checked={recorrente}
              disabled={parcelas > 1}
              onChange={(e) => setRecorrente(e.target.checked)}
              className="h-5 w-5 accent-[var(--destaque)]"
            />
          </label>
        </div>
      ) : inicial.parcela ? (
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-linha bg-superficie-2/50 p-3.5 text-sm">
          <span className="text-texto">
            Parcela {inicial.parcela.atual} de {inicial.parcela.total}.{" "}
            <span className="text-suave">
              Aplicar descrição e categoria a todas
            </span>
          </span>
          <input
            type="checkbox"
            checked={serie}
            onChange={(e) => setSerie(e.target.checked)}
            className="h-5 w-5 accent-[var(--destaque)]"
          />
        </label>
      ) : (
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-linha bg-superficie-2/50 p-3.5 text-sm">
          <span className="flex items-center gap-2 font-medium text-texto">
            <Repeat className="h-4 w-4 text-suave" aria-hidden="true" />
            Repete todo mês
          </span>
          <input
            type="checkbox"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
            className="h-5 w-5 accent-[var(--destaque)]"
          />
        </label>
      )}

      {erro ? (
        <p
          role="alert"
          className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex gap-2">
        {editando ? (
          <button
            type="button"
            onClick={excluir}
            disabled={salvando}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-linha text-erro hover:bg-erro/10"
            aria-label="Excluir lançamento"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={salvando}
          className="gradiente-marca flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {salvando ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-5 w-5" aria-hidden="true" />
          )}
          {editando
            ? "Salvar alterações"
            : valor
              ? `Lançar ${brl(valor)}`
              : "Lançar"}
        </button>
      </div>
    </form>
  );
}
