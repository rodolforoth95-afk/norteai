import { AvisoEducacional } from "./AvisoEducacional";

// Marcador das telas que chegam nas próximas etapas.
export function EmConstrucao({ titulo, etapa, texto }: { titulo: string; etapa: number; texto: string }) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-texto">{titulo}</h1>
      <div className="rounded-2xl border border-linha bg-superficie p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ciano">Etapa {etapa}</p>
        <p className="mt-2 text-texto">{texto}</p>
      </div>
      <AvisoEducacional />
    </section>
  );
}
