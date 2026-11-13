"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Cartao } from "@/components/ui";
import { LinhaAtivo } from "@/components/mercado";

type Item = { simbolo: string; nome: string; logo: string | null; preco: number | null; variacaoPct: number | null };

// Abas em uma faixa centralizada que desliza para o lado (com setas quando não cabe tudo).
export function AbasDestaques({ abas }: { abas: { id: string; rotulo: string; descricao: string; itens: Item[] }[] }) {
  const [ativa, setAtiva] = useState(abas[0].id);
  const faixa = useRef<HTMLDivElement>(null);
  const [setas, setSetas] = useState({ esquerda: false, direita: false });
  const aba = abas.find((a) => a.id === ativa) ?? abas[0];

  function medir() {
    const el = faixa.current;
    if (!el) return;
    setSetas({ esquerda: el.scrollLeft > 4, direita: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  function escolher(id: string, botao: HTMLButtonElement) {
    setAtiva(id);
    botao.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function rolar(direcao: 1 | -1) {
    faixa.current?.scrollBy({ left: direcao * 160, behavior: "smooth" });
  }

  return (
    <Cartao className="flex flex-col gap-4">
      <div className="relative">
        <div
          ref={faixa}
          onScroll={medir}
          className="snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Destaques do mercado"
        >
          <div className="mx-auto flex w-max gap-1 rounded-2xl bg-superficie-2 p-1">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={a.id === ativa}
                onClick={(e) => escolher(a.id, e.currentTarget)}
                className={`min-h-10 shrink-0 snap-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                  a.id === ativa ? "gradiente-marca text-white shadow" : "text-suave hover:text-texto"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
        {setas.esquerda ? (
          <button
            type="button"
            onClick={() => rolar(-1)}
            aria-label="Ver abas anteriores"
            className="absolute inset-y-0 left-0 flex w-10 items-center justify-start bg-gradient-to-r from-superficie via-superficie/90 to-transparent text-texto"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        {setas.direita ? (
          <button
            type="button"
            onClick={() => rolar(1)}
            aria-label="Ver mais abas"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-superficie via-superficie/90 to-transparent text-texto"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p className="text-center text-xs text-suave">{aba.descricao}</p>
      <ul className="-mx-2 flex flex-col" role="tabpanel">
        {aba.itens.map((i, idx) => (
          <LinhaAtivo key={i.simbolo} posicao={idx + 1} {...i} />
        ))}
      </ul>
    </Cartao>
  );
}
