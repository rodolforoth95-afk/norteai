import { Info } from "lucide-react";

export const TEXTO_AVISO = "Conteúdo educacional. Não é recomendação de investimento.";

export function AvisoEducacional({ extra }: { extra?: string }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-suave">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {TEXTO_AVISO}
        {extra ? ` ${extra}` : null}
      </span>
    </p>
  );
}
