import type { ReactNode } from "react";
import { COR_RISCO } from "@/lib/dominio/catalogo";
import type { Risco } from "@/lib/dominio/tipos";

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-linha bg-superficie/80 p-5 ${className}`}>{children}</div>;
}

export function TituloSecao({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-texto">{titulo}</h2>
        {subtitulo ? <p className="mt-0.5 text-sm text-suave">{subtitulo}</p> : null}
      </div>
      {acao}
    </div>
  );
}

export function SeloRisco({ risco }: { risco: Risco }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${COR_RISCO[risco]}`}>
      Risco {risco.toLowerCase()}
    </span>
  );
}
