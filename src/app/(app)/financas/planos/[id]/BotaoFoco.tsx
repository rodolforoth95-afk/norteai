"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { selecionarPlano } from "@/app/acoes-financas";

// Define este plano como o que aparece em destaque no controle financeiro.
export function BotaoFoco({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await selecionarPlano(id);
          router.refresh();
        })
      }
      className="gradiente-marca flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-70"
    >
      {pendente ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      )}
      Usar no controle
    </button>
  );
}
