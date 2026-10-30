"use client";

import { useState } from "react";
import { Cartao } from "@/components/ui";
import { LinhaAtivo } from "@/components/mercado";

type Item = { simbolo: string; nome: string; logo: string | null; preco: number | null; variacaoPct: number | null };

export function AbasDestaques({ abas }: { abas: { id: string; rotulo: string; descricao: string; itens: Item[] }[] }) {
  const [ativa, setAtiva] = useState(abas[0].id);
  const aba = abas.find((a) => a.id === ativa) ?? abas[0];
  return (
    <Cartao className="flex flex-col gap-4">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" role="tablist" aria-label="Destaques do mercado">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === ativa}
            onClick={() => setAtiva(a.id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
              a.id === ativa ? "gradiente-marca text-black" : "border border-linha text-suave hover:text-texto"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <p className="text-xs text-suave">{aba.descricao}</p>
      <ul className="-mx-2 flex flex-col" role="tabpanel">
        {aba.itens.map((i, idx) => (
          <LinhaAtivo key={i.simbolo} posicao={idx + 1} {...i} />
        ))}
      </ul>
    </Cartao>
  );
}
