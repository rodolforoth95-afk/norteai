"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { atualizarAtivo, atualizarMercado } from "@/app/acoes";

// Busca os números mais recentes na brapi (o plano gratuito atualiza as cotações a cada 30 min).
export function BotaoAtualizar({ simbolo, horario }: { simbolo?: string; horario?: string | null }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoAgora, setAtualizadoAgora] = useState(false);
  const [pendente, iniciar] = useTransition();

  function atualizar() {
    setErro(null);
    iniciar(async () => {
      const r = simbolo ? await atualizarAtivo(simbolo) : await atualizarMercado();
      if ("erro" in r && r.erro) {
        setErro(r.erro);
        return;
      }
      router.refresh();
      setAtualizadoAgora(true);
      setTimeout(() => setAtualizadoAgora(false), 4000);
    });
  }

  const hora = horario ? new Date(horario).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-right text-[11px] leading-tight text-suave ${erro ? "" : "hidden sm:inline"}`} aria-live="polite">
        {erro ?? (atualizadoAgora ? "Atualizado" : hora ? `Cotação das ${hora}` : "Atraso de até 30 min")}
      </span>
      <button
        type="button"
        onClick={atualizar}
        disabled={pendente}
        aria-label="Atualizar números"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-linha bg-superficie text-ciano transition hover:border-violeta disabled:opacity-60"
      >
        <RefreshCw className={`h-5 w-5 ${pendente ? "animate-spin" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}
