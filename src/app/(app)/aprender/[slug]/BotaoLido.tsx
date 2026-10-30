"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/Botao";
import { marcarLido } from "@/app/acoes";

export function BotaoLido({ slug, lido }: { slug: string; lido: boolean }) {
  const router = useRouter();
  const [moedas, setMoedas] = useState<number | null>(null);
  const [pendente, iniciar] = useTransition();

  if (lido) {
    return (
      <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-menta/40 bg-menta/10 font-medium text-menta" role="status">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        {moedas ? `Lido · +${moedas} coins` : "Conteúdo lido"}
      </p>
    );
  }

  return (
    <Botao
      larguraTotal
      carregando={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await marcarLido(slug);
          setMoedas(r.moedas);
          router.refresh();
        })
      }
    >
      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      Marcar como lido · +15 coins
    </Botao>
  );
}
