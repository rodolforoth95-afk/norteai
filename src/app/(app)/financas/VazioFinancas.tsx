"use client";

import { Camera, Keyboard, Mic } from "lucide-react";
import { Mascote } from "@/components/Logo";
import { useLancador } from "@/components/financas/Lancador";
import { BotaoExemploFinancas } from "./BotoesExemplo";

export function VazioFinancas() {
  const { abrir } = useLancador();
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">Finanças</h1>
      <div className="painel flex flex-col gap-7 p-6 lg:flex-row lg:items-center lg:p-8">
        <div className="max-w-xl flex-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-superficie-2">
            <Mascote className="h-8 w-8" piscando />
          </span>
          <p className="mt-4 font-display text-xl font-extrabold text-texto">Para onde vai o seu dinheiro todo mês?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-suave">
            Lance receitas e despesas do jeito mais rápido para você: falando, fotografando o comprovante ou digitando. Eu separo por categoria, aprendo com as suas
            correções e mostro quanto sobra para investir, com um plano de onde ajustar.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3 lg:w-[26rem] lg:grid-cols-1">
          {[
            { m: "voz" as const, Icone: Mic, titulo: "Falar", texto: "“Gastei 85 no almoço no débito”" },
            { m: "camera" as const, Icone: Camera, titulo: "Fotografar", texto: "Nota fiscal, cupom ou comprovante de Pix" },
            { m: "texto" as const, Icone: Keyboard, titulo: "Digitar", texto: "Formulário que completa sozinho" },
          ].map(({ m, Icone, titulo, texto }) => (
            <button key={m} type="button" onClick={() => abrir(m)} className="flex items-center gap-3 rounded-xl border border-linha bg-superficie-2/50 p-3.5 text-left transition hover:border-ciano">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie text-ciano">
                <Icone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-texto">{titulo}</span>
                <span className="block text-xs text-suave">{texto}</span>
              </span>
            </button>
          ))}
          <BotaoExemploFinancas />
        </div>
      </div>
    </section>
  );
}
