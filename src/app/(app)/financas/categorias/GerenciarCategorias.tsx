"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Categoria, Regra, TipoLancamento } from "@/lib/dominio/financas";
import {
  excluirCategoria,
  excluirRegra,
  salvarCategoria,
} from "@/app/acoes-financas";
import {
  ICONES,
  ICONES_ESCOLHA,
  IconeCategoria,
} from "@/components/financas/IconeCategoria";

const CORES = [
  "#2D5BFF",
  "#7C9BFF",
  "#14B8A6",
  "#10B981",
  "#F59E0B",
  "#FF8A3D",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#0EA5E9",
  "#64748B",
  "#A3E635",
];

type Edicao = {
  id?: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
  icone: string;
  paiId: string | null;
  essencial: boolean;
  padrao: boolean;
};

export function GerenciarCategorias({
  categorias,
  regras,
  usos,
}: {
  categorias: Categoria[];
  regras: Regra[];
  usos: Record<string, number>;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const nome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const principais = categorias.filter((c) => c.tipo === tipo && !c.paiId);

  function executar(
    acao: () => Promise<{ ok: true } | { erro: string }>,
    depois?: () => void,
  ) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("erro" in r) setErro(r.erro);
      else {
        depois?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
      <div className="painel flex flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-5 py-4">
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
                onClick={() => setTipo(t)}
                className={`min-h-9 rounded-full px-4 text-xs font-semibold ${tipo === t ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
              >
                {t === "despesa" ? "Despesas" : "Receitas"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setEdicao({
                nome: "",
                tipo,
                cor: CORES[0],
                icone: "Tag",
                paiId: null,
                essencial: false,
                padrao: false,
              })
            }
            className="flex h-10 items-center gap-1.5 rounded-xl bg-superficie-2 px-3.5 text-sm font-semibold text-texto hover:brightness-110"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova categoria
          </button>
        </div>

        {erro ? (
          <p
            role="alert"
            className="mx-5 mt-4 rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
          >
            {erro}
          </p>
        ) : null}

        <ul className="divide-y divide-linha">
          {principais.map((c) => {
            const filhas = categorias.filter((f) => f.paiId === c.id);
            return (
              <li key={c.id} className="px-5 py-3">
                <LinhaCategoria
                  c={c}
                  usos={usos[c.id] ?? 0}
                  aoEditar={() => setEdicao({ ...c })}
                  aoExcluir={() =>
                    window.confirm(
                      `Excluir “${c.nome}”? Os lançamentos vão para a categoria geral.`,
                    ) && executar(() => excluirCategoria(c.id))
                  }
                />
                {filhas.length ? (
                  <ul className="ml-[18px] mt-2 flex flex-col gap-1 border-l-2 border-linha pl-5">
                    {filhas.map((f) => (
                      <li key={f.id}>
                        <LinhaCategoria
                          c={f}
                          usos={usos[f.id] ?? 0}
                          pequena
                          aoEditar={() => setEdicao({ ...f })}
                          aoExcluir={() =>
                            window.confirm(
                              `Excluir “${f.nome}”? Os lançamentos voltam para “${c.nome}”.`,
                            ) && executar(() => excluirCategoria(f.id))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={`flex flex-col gap-5 ${edicao ? "order-first lg:order-none" : ""}`}
      >
        {edicao ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executar(
                () =>
                  salvarCategoria({
                    id: edicao.id,
                    nome: edicao.nome,
                    tipo: edicao.tipo,
                    cor: edicao.cor,
                    icone: edicao.icone,
                    paiId: edicao.paiId,
                    essencial: edicao.essencial,
                  }),
                () => setEdicao(null),
              );
            }}
            className="painel flex flex-col gap-4 p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-texto">
                {edicao.id ? "Editar categoria" : "Nova categoria"}
              </h2>
              <button
                type="button"
                onClick={() => setEdicao(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <IconeCategoria
                icone={edicao.icone}
                cor={edicao.cor}
                tamanho={44}
              />
              <input
                value={edicao.nome}
                onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })}
                maxLength={30}
                placeholder="Ex.: Pet, Viagens, Academia"
                autoFocus
                className="h-11 min-w-0 flex-1 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm text-texto outline-none focus:border-ciano"
              />
            </div>
            {!edicao.padrao ? (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-suave">
                Dentro de
                <select
                  value={edicao.paiId ?? ""}
                  onChange={(e) =>
                    setEdicao({ ...edicao, paiId: e.target.value || null })
                  }
                  className="h-11 rounded-xl border border-linha bg-superficie-2 px-3 text-sm font-normal text-texto"
                >
                  <option value="">Nenhuma (categoria principal)</option>
                  {categorias
                    .filter(
                      (c) =>
                        c.tipo === edicao.tipo &&
                        !c.paiId &&
                        c.id !== edicao.id,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-suave">Cor</span>
              <div className="flex flex-wrap gap-2">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setEdicao({ ...edicao, cor })}
                    aria-label={`Cor ${cor}`}
                    aria-pressed={edicao.cor === cor}
                    className={`h-8 w-8 rounded-full ${edicao.cor === cor ? "ring-2 ring-texto ring-offset-2 ring-offset-[var(--superficie)]" : ""}`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-suave">Ícone</span>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([edicao.icone, ...ICONES_ESCOLHA])]
                  .filter((i) => ICONES[i])
                  .map((i) => {
                    const Icone = ICONES[i];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEdicao({ ...edicao, icone: i })}
                        aria-label={i}
                        aria-pressed={edicao.icone === i}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${edicao.icone === i ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
                      >
                        <Icone
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
              </div>
            </div>
            {edicao.tipo === "despesa" ? (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-linha p-3 text-sm">
                <span>
                  <span className="block font-medium text-texto">
                    Gasto essencial
                  </span>
                  <span className="text-xs text-suave">
                    O plano nunca sugere corte aqui
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={edicao.essencial}
                  onChange={(e) =>
                    setEdicao({ ...edicao, essencial: e.target.checked })
                  }
                  className="h-5 w-5 accent-[var(--destaque)]"
                />
              </label>
            ) : null}
            <button
              type="submit"
              disabled={pendente}
              className="gradiente-marca flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
            >
              {pendente ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Salvar categoria
            </button>
          </form>
        ) : null}

        <div className="painel flex flex-col p-0">
          <div className="border-b border-linha px-5 py-4">
            <h2 className="font-display text-base font-bold text-texto">
              O que eu aprendi
            </h2>
            <p className="text-xs text-suave">
              Estabelecimento → categoria que você escolheu. Exclua para eu
              voltar a sugerir sozinho.
            </p>
          </div>
          {regras.length ? (
            <ul className="max-h-[28rem] divide-y divide-linha overflow-y-auto">
              {regras.map((r) => (
                <li
                  key={r.chave}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium capitalize text-texto">
                      {r.chave}
                    </span>
                    <span className="text-xs text-suave">
                      {nome(r.categoriaId)} · {r.usos}{" "}
                      {r.usos === 1 ? "vez" : "vezes"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => executar(() => excluirRegra(r.chave))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-erro"
                    aria-label={`Esquecer regra de ${r.chave}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-suave">
              Ainda nada. Cada lançamento salvo me ensina um pouco.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LinhaCategoria({
  c,
  usos,
  pequena,
  aoEditar,
  aoExcluir,
}: {
  c: Categoria;
  usos: number;
  pequena?: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconeCategoria icone={c.icone} cor={c.cor} tamanho={pequena ? 28 : 36} />
      <span className="min-w-0 flex-1">
        <span
          className={`flex items-center gap-1.5 truncate font-medium text-texto ${pequena ? "text-[13px]" : "text-sm"}`}
        >
          {c.nome}
          {c.essencial ? (
            <Lock className="h-3 w-3 text-suave" aria-label="Essencial" />
          ) : null}
        </span>
        <span className="text-xs text-suave">
          {usos
            ? `${usos} ${usos === 1 ? "lançamento" : "lançamentos"}`
            : "sem lançamentos"}
        </span>
      </span>
      <button
        type="button"
        onClick={aoEditar}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
        aria-label={`Editar ${c.nome}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      {!c.padrao ? (
        <button
          type="button"
          onClick={aoExcluir}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-erro"
          aria-label={`Excluir ${c.nome}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
