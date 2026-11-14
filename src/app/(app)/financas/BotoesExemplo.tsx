"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  apagarExemploFinancas,
  carregarExemploFinancas,
} from "@/app/acoes-financas";

export function BotaoExemploFinancas({
  apagar = false,
  className = "",
}: {
  apagar?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            if (
              apagar &&
              !window.confirm(
                "Apagar os lançamentos de exemplo? Os seus continuam.",
              )
            )
              return;
            const r = apagar
              ? await apagarExemploFinancas()
              : await carregarExemploFinancas();
            if ("erro" in r) setErro(r.erro);
            else router.refresh();
          })
        }
        className={
          className ||
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2 disabled:opacity-60"
        }
      >
        {pendente ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {apagar ? "Apagar exemplo" : "Ver com dados de exemplo"}
      </button>
      {erro ? <span className="text-xs text-erro">{erro}</span> : null}
    </span>
  );
}
