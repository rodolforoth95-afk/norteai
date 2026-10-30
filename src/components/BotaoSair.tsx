"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { postarJson } from "@/lib/email-pendente";

// Encerra a sessão e volta para o login. Recarrega a página inteira para não
// sobrar nenhuma tela da conta guardada na memória do navegador.
export function BotaoSair({ comRotulo = false }: { comRotulo?: boolean }) {
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await postarJson("/api/auth/sair", {});
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      aria-label="Sair da conta"
      className={`flex min-h-11 items-center gap-2 rounded-xl border border-linha bg-superficie text-suave transition hover:border-erro/60 hover:text-erro disabled:opacity-60 ${
        comRotulo ? "w-full px-3 text-sm font-medium" : "w-11 justify-center"
      }`}
    >
      <LogOut className="h-5 w-5" aria-hidden="true" />
      {comRotulo ? (saindo ? "Saindo..." : "Sair") : null}
    </button>
  );
}
