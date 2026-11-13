"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Tema = "escuro" | "claro";

// Alterna entre modo escuro e claro. A escolha fica num cookie para a página já
// abrir na cor certa da próxima vez (sem piscar).
export function AlternarTema({ comRotulo = false }: { comRotulo?: boolean }) {
  const [tema, setTema] = useState<Tema>("escuro");

  useEffect(() => {
    setTema((document.documentElement.dataset.tema as Tema) ?? "escuro");
  }, []);

  function alternar() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    document.documentElement.dataset.tema = novo;
    document.cookie = `tema=${novo}; path=/; max-age=31536000; samesite=lax`;
    setTema(novo);
  }

  const Icone = tema === "escuro" ? Sun : Moon;
  const rotulo = tema === "escuro" ? "Modo claro" : "Modo noite";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`Ativar ${rotulo.toLowerCase()}`}
      className={`flex min-h-11 items-center gap-2 rounded-xl border border-linha bg-superficie text-texto transition hover:border-violeta ${
        comRotulo ? "w-full px-3 text-sm font-medium" : "w-11 justify-center"
      }`}
    >
      <Icone className="h-5 w-5 text-ciano" aria-hidden="true" />
      {comRotulo ? rotulo : null}
    </button>
  );
}
