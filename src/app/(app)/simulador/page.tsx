import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { CARTEIRAS } from "@/lib/dominio/simulador";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { indicadores } from "@/lib/servidor/indicadores";
import { Simulador } from "./Simulador";
import { AbasSimulador } from "./AbasSimulador";

export const metadata = { title: "Simulador de carteiras" };

// Módulo de simulação: 3 carteiras de exemplo do estilo da pessoa, projetadas com
// os juros, a inflação e o histórico de mercado do momento.
export default async function PaginaSimulador() {
  const { uid, repo } = await exigirUsuario();
  const perfil = await repo.obterPerfil(uid);

  if (!perfil) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <AbasSimulador />
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.01em] text-texto">Simulador de carteiras</h1>
        <Link href="/entrevista" className="borda-gradiente flex items-center gap-4 rounded-2xl p-5">
          <FlaskConical className="h-8 w-8 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-semibold text-texto">Primeiro, descubra seu estilo de investidor</span>
            <span className="block text-sm text-suave">As carteiras de exemplo são montadas para o seu estilo. São 9 perguntas rápidas.</span>
          </span>
          <ArrowRight className="h-5 w-5 text-ciano" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const ind = await indicadores();
  return (
    <div className="flex flex-col gap-5">
      <AbasSimulador />
      <Simulador estilo={perfil.estilo} carteiras={CARTEIRAS[perfil.estilo]} ind={ind} />
    </div>
  );
}
