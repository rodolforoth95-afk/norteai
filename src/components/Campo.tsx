"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string | null;
};

export const ESTILO_INPUT =
  "min-h-12 w-full rounded-2xl border bg-superficie/80 px-4 text-base text-texto placeholder:text-suave/70 focus:border-violeta focus:outline-none focus:ring-2 focus:ring-violeta/40";

export function Campo({ rotulo, ajuda, erro, id, className = "", ...resto }: CampoProps) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const ajudaId = `${campoId}-ajuda`;
  const erroId = `${campoId}-erro`;
  const descritores = [ajuda ? ajudaId : null, erro ? erroId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={campoId} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <input
        id={campoId}
        className={`${ESTILO_INPUT} ${erro ? "border-erro" : "border-linha"} ${className}`}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores || undefined}
        {...resto}
      />
      {ajuda ? (
        <p id={ajudaId} className="text-xs text-suave">
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={erroId} className="text-sm text-erro" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function CampoSenha(props: Omit<CampoProps, "type">) {
  const [visivel, setVisivel] = useState(false);
  const gerado = useId();
  const campoId = props.id ?? gerado;
  return (
    <div className="relative">
      <Campo {...props} id={campoId} type={visivel ? "text" : "password"} className="pr-24" />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-controls={campoId}
        aria-pressed={visivel}
        className="absolute right-1 top-[1.75rem] min-h-11 rounded-xl px-3 text-sm font-medium text-ciano hover:bg-superficie-2"
      >
        {visivel ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

export function CaixaSelecao({
  children,
  marcado,
  aoMudar,
}: {
  children: ReactNode;
  marcado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 h-6 w-6 shrink-0 rounded accent-violeta"
      />
      <label htmlFor={id} className="text-sm leading-6 text-texto">
        {children}
      </label>
    </div>
  );
}

export function Alerta({ tipo = "erro", children }: { tipo?: "erro" | "info"; children: ReactNode }) {
  const estilo =
    tipo === "erro"
      ? "border-erro/50 bg-erro/10 text-erro"
      : "border-ciano/30 bg-ciano/10 text-texto";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${estilo}`}>
      {children}
    </div>
  );
}
