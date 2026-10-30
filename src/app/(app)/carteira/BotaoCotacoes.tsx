"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CandlestickChart } from "lucide-react";
import { Botao } from "@/components/Botao";
import { atualizarCotacoes } from "@/app/acoes";

// Recalcula o valor das ações, FIIs e ETFs da carteira com a cotação do mercado.
export function BotaoCotacoes() {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Botao
        larguraTotal
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            setMensagem(null);
            const r = await atualizarCotacoes();
            if ("erro" in r && r.erro) return setMensagem(r.erro);
            if ("atualizados" in r) {
              const extra = r.ganhos?.length ? ` · ${r.ganhos.join(" · ")}` : "";
              setMensagem(`${r.atualizados} de ${r.total} investimentos atualizados pela cotação do mercado${extra}.`);
            }
            router.refresh();
          })
        }
      >
        <CandlestickChart className="h-4 w-4" aria-hidden="true" />
        Atualizar com cotações do mercado
      </Botao>
      {mensagem ? (
        <p className="text-center text-xs text-suave" role="status">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}
