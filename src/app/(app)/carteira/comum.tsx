"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Coins, TriangleAlert, X } from "lucide-react";
import { lerNumeroBR } from "@/lib/dominio/classificar";
import { hojeBR } from "@/lib/dominio/carteira";

// Peças compartilhadas pelas telas da carteira.

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brlCurto = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : Math.abs(v) >= 10_000
      ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
      : brl0(v);
export const pct = (v: number | null, casas = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
export const sinalReais = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${brl(Math.abs(v))}`;
export const tom = (v: number | null) => (v === null ? "text-suave" : v > 0.004 ? "text-menta" : v < -0.004 ? "text-erro" : "text-texto");

export function nomeMesLongo(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function nomeMesCurto(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export const ESTILO_CAMPO =
  "min-h-12 w-full rounded-xl border border-linha bg-superficie-2 px-3 text-base text-texto placeholder:text-suave/70 focus:border-ciano focus:outline-none focus:ring-2 focus:ring-ciano/30";

// Campo de dinheiro no formato brasileiro ("1.234,56").
export function CampoDinheiro({
  rotulo,
  valor,
  onChange,
  ajuda,
  obrigatorio = false,
  autoFocus = false,
}: {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  ajuda?: ReactNode;
  obrigatorio?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {rotulo}
        {obrigatorio ? <span className="text-ciano"> *</span> : null}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-linha bg-superficie-2 px-3 focus-within:border-ciano">
        <span className="text-sm font-semibold text-suave">R$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="0,00"
          className="min-h-12 w-full bg-transparent text-base font-semibold text-texto outline-none"
        />
      </div>
      {ajuda ? <p className="text-xs text-suave">{ajuda}</p> : null}
    </div>
  );
}

export function lerDinheiro(texto: string) {
  const v = lerNumeroBR(texto);
  return v === null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
}

export function paraTextoDinheiro(v: number | null) {
  return v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Data com limite em hoje: o seletor do navegador não deixa escolher datas futuras.
export function CampoData({ rotulo, valor, onChange, ajuda }: { rotulo: string; valor: string; onChange: (v: string) => void; ajuda?: ReactNode }) {
  const id = useId();
  const hoje = hojeBR();
  const futura = valor > hoje;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <input
        id={id}
        type="date"
        max={hoje}
        min="1990-01-01"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${ESTILO_CAMPO} ${futura ? "border-erro" : ""}`}
        aria-invalid={futura || undefined}
      />
      {futura ? (
        <p className="text-sm text-erro" role="alert">
          A data não pode ser depois de hoje.
        </p>
      ) : ajuda ? (
        <p className="text-xs text-suave">{ajuda}</p>
      ) : null}
    </div>
  );
}

// Executa uma ação do servidor, mostra o erro ou as coins ganhas e atualiza a tela.
export function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ganhos, setGanhos] = useState<string[]>([]);

  function executar<T extends { erro: string } | { ok: true; ganhos?: string[] }>(acao: () => Promise<T>, depois?: (r: Exclude<T, { erro: string }>) => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      if (r.ganhos?.length) setGanhos(r.ganhos);
      depois?.(r as Exclude<T, { erro: string }>);
      router.refresh();
    });
  }
  return { executar, pendente, erro, setErro, ganhos, limparGanhos: () => setGanhos([]) };
}

export function AvisoErro({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro" role="alert">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function AvisoGanhos({ ganhos, onFechar }: { ganhos: string[]; onFechar: () => void }) {
  if (!ganhos.length) return null;
  return (
    <p className="flex items-center gap-2 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm font-medium text-ambar" role="status">
      <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{ganhos.join(" · ")}</span>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ambar/20">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </p>
  );
}

// Janela sobreposta simples (vira folha de baixo no celular).
export function Janela({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-linha bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onFechar()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-texto">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-xl text-suave hover:bg-superficie-2 hover:text-texto">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
