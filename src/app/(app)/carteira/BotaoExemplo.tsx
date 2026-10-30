"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { Botao } from "@/components/Botao";
import { carregarCarteiraExemplo } from "@/app/acoes";

// Só aparece no modo de teste.
export function BotaoExemplo() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <Botao
      variante="secundario"
      larguraTotal
      carregando={pendente}
      onClick={() =>
        iniciar(async () => {
          await carregarCarteiraExemplo();
          router.refresh();
        })
      }
    >
      <FlaskConical className="h-4 w-4" aria-hidden="true" />
      Carregar carteira de exemplo (teste)
    </Botao>
  );
}
