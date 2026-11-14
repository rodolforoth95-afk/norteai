"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trophy,
} from "lucide-react";
import { selecionarPlano } from "@/app/acoes-financas";
import { Mascote } from "@/components/Logo";
import { brl0 } from "@/components/financas/formato";

export type CartaoPlano = {
  id: string;
  nome: string;
  destino: string;
  valorMensal: number;
  meses: number;
  ativo: boolean;
  alvoPct: number | null;
  ritmo: string | null;
  degrauPct: number | null;
  guardadoPct: number | null;
  pct: number;
  economizado: number;
  objetivo: number;
};

// Entrada de Finanças: a pessoa escolhe com qual plano quer acompanhar o mês (ou cria outro).
export function EscolherPlano({
  planos,
  primeiroNome,
  rendaAtual,
}: {
  planos: CartaoPlano[];
  primeiroNome: string;
  rendaAtual: number;
}) {
  const router = useRouter();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function abrir(id: string | null) {
    setErro(null);
    setAbrindo(id ?? "sem");
    iniciar(async () => {
      const r = await selecionarPlano(id);
      if ("erro" in r) {
        setErro(r.erro);
        setAbrindo(null);
      } else router.push(`/financas?p=${id ?? "sem"}`);
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16 lg:pb-20">
      <header className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-superficie-2">
          <Mascote className="h-8 w-8" piscando />
        </span>
        <div>
          <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">
            {planos.length
              ? `Olá, ${primeiroNome}. Qual plano vamos acompanhar?`
              : `Olá, ${primeiroNome}. Vamos montar seu plano?`}
          </h1>
          <p className="mt-1 text-sm text-suave">
            {planos.length
              ? "Escolha um plano para abrir Finanças com as metas dele. Você pode trocar sempre que entrar."
              : `Hoje você guarda cerca de ${rendaAtual}% da renda. Em 4 passos você define quanto quer guardar e investir por mês.`}
          </p>
        </div>
      </header>

      {erro ? (
        <p
          role="alert"
          className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {planos.map((p) => (
          <li
            key={p.id}
            className={`painel relative flex min-w-0 flex-col gap-4 p-5 transition ${p.ativo ? "ring-2 ring-ciano/60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="degrade-ativo flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  {p.ativo ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ciano">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />{" "}
                      Último usado
                    </p>
                  ) : null}
                  <h2 className="truncate font-display text-lg font-semibold text-texto">
                    {p.nome}
                  </h2>
                  <p className="text-xs text-suave">
                    {brl0(p.valorMensal)}/mês para {p.destino.toLowerCase()} ·{" "}
                    {p.meses} meses
                  </p>
                </div>
              </div>
              <Link
                href={`/financas/jornada?plano=${p.id}`}
                aria-label={`Editar ${p.nome}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-suave hover:bg-superficie-2 hover:text-texto"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-superficie-2/60 p-3">
                <p className="flex items-center gap-1 text-[11px] text-suave">
                  <Trophy className="h-3 w-3 text-ciano" aria-hidden="true" />{" "}
                  Meta de guardar
                </p>
                <p className="font-display text-base font-semibold tabular-nums text-texto">
                  {p.alvoPct !== null ? `${p.alvoPct}% da renda` : "—"}
                </p>
                {p.degrauPct !== null ? (
                  <p className="text-[11px] text-suave">
                    degrau do mês {p.degrauPct}% · agora{" "}
                    {Math.round(p.guardadoPct ?? 0)}%
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl bg-superficie-2/60 p-3">
                <p className="flex items-center gap-1 text-[11px] text-suave">
                  <BarChart3
                    className="h-3 w-3 text-ciano"
                    aria-hidden="true"
                  />{" "}
                  Aporte acumulado
                </p>
                <p className="font-display text-base font-semibold tabular-nums text-texto">
                  {brl0(p.economizado)}
                </p>
                <p className="text-[11px] text-suave">de {brl0(p.objetivo)}</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-superficie-2">
              <div
                className="degrade-ativo h-full rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, p.pct))}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => abrir(p.id)}
              disabled={abrindo !== null}
              className="gradiente-marca flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white hover:brightness-110 disabled:opacity-70"
            >
              {abrindo === p.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Abrir este plano{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}

        <li>
          <Link
            href="/financas/jornada"
            className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-3 rounded-[1.375rem] border-2 border-dashed border-linha p-6 text-center transition hover:border-ciano hover:bg-ciano/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ciano/15 text-ciano">
              <Plus className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold text-texto">
              {planos.length
                ? "Criar outro plano"
                : "Montar meu primeiro plano"}
            </span>
            <span className="max-w-xs text-sm text-suave">
              Ponto de partida, quanto guardar, plano de aporte e revisão.
            </span>
          </Link>
        </li>
      </ul>

      <button
        type="button"
        onClick={() => abrir(null)}
        disabled={abrindo !== null}
        className="mx-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-suave hover:bg-superficie-2 hover:text-texto"
      >
        {abrindo === "sem" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Ver Finanças sem plano
      </button>
    </section>
  );
}
