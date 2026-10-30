import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { iaDisponivel } from "@/lib/servidor/ia";
import { ChatEntrevista } from "./ChatEntrevista";

// Tela 4 — Entrevista (onboarding)
export default async function PaginaEntrevista({
  searchParams,
}: {
  searchParams: Promise<{ refazer?: string }>;
}) {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const { refazer } = await searchParams;
  const estado = await repo.obterEntrevista(uid);
  if (estado?.concluida && refazer !== "1") redirect("/inicio");
  return (
    <ChatEntrevista
      primeiroNome={primeiroNome}
      inicial={estado ?? { respostas: {}, concluida: false, atualizada_em: "" }}
      refazer={refazer === "1"}
      iaAtiva={iaDisponivel()}
    />
  );
}
