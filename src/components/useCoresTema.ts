"use client";

import { useEffect, useState } from "react";

// Cores do tema atual para os gráficos (que precisam de cores fixas, não de classes).
// Acompanha a troca entre modo claro e escuro.

export type CoresTema = { fundo: string; superficie: string; superficie2: string; linha: string; texto: string; suave: string; destaque: string };

const ESCURO: CoresTema = {
  fundo: "#000000",
  superficie: "#111111",
  superficie2: "#1b1b1b",
  linha: "#2b2b2b",
  texto: "#ffffff",
  suave: "#a6a6a6",
  destaque: "#ffb020",
};

function ler(): CoresTema {
  const s = getComputedStyle(document.documentElement);
  const v = (nome: string, padrao: string) => s.getPropertyValue(nome).trim() || padrao;
  return {
    fundo: v("--fundo", ESCURO.fundo),
    superficie: v("--superficie", ESCURO.superficie),
    superficie2: v("--superficie-2", ESCURO.superficie2),
    linha: v("--linha", ESCURO.linha),
    texto: v("--texto", ESCURO.texto),
    suave: v("--suave", ESCURO.suave),
    destaque: v("--destaque", ESCURO.destaque),
  };
}

export function useCoresTema() {
  const [cores, setCores] = useState<CoresTema>(ESCURO);
  useEffect(() => {
    setCores(ler());
    const observador = new MutationObserver(() => setCores(ler()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => observador.disconnect();
  }, []);
  return cores;
}
