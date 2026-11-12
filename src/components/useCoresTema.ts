"use client";

import { useEffect, useState } from "react";

// Cores do tema atual para os gráficos (que precisam de cores fixas, não de classes).
// Acompanha a troca entre modo claro e escuro.

export type CoresTema = { fundo: string; superficie: string; superficie2: string; linha: string; texto: string; suave: string; destaque: string };

const PADRAO: CoresTema = {
  fundo: "#f7f9ff",
  superficie: "#ffffff",
  superficie2: "#f2f5ff",
  linha: "#dde4ff",
  texto: "#14215c",
  suave: "#525b85",
  destaque: "#2d5bff",
};

function ler(): CoresTema {
  const s = getComputedStyle(document.documentElement);
  const v = (nome: string, padrao: string) => s.getPropertyValue(nome).trim() || padrao;
  return {
    fundo: v("--fundo", PADRAO.fundo),
    superficie: v("--superficie", PADRAO.superficie),
    superficie2: v("--superficie-2", PADRAO.superficie2),
    linha: v("--linha", PADRAO.linha),
    texto: v("--texto", PADRAO.texto),
    suave: v("--suave", PADRAO.suave),
    destaque: v("--destaque", PADRAO.destaque),
  };
}

export function useCoresTema() {
  const [cores, setCores] = useState<CoresTema>(PADRAO);
  useEffect(() => {
    setCores(ler());
    const observador = new MutationObserver(() => setCores(ler()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => observador.disconnect();
  }, []);
  return cores;
}
