import type { Categoria, ItemOrcamento } from "@/lib/dominio/financas";
import { IconeCategoria } from "./IconeCategoria";
import { brl0 } from "./formato";

// Termômetro em anel: a volta enche com o gasto e muda de cor (verde, laranja, vermelho).
export function AnelOrcamento({
  item,
  categoria,
}: {
  item: ItemOrcamento;
  categoria?: Categoria;
}) {
  const raio = 26;
  const volta = 2 * Math.PI * raio;
  const fracao = Math.min(1, item.pct / 100);
  const cor =
    item.estado === "estourou"
      ? "var(--baixa)"
      : item.estado === "atencao"
        ? "var(--gravata)"
        : "var(--alta)";
  const resta = item.limite - item.gasto;
  return (
    <div
      className="flex flex-col items-center gap-1.5 text-center"
      role="meter"
      aria-valuenow={Math.round(item.pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${categoria?.nome ?? "Outros"}: ${brl0(item.gasto)} de ${brl0(item.limite)}`}
    >
      <span className="relative flex h-[68px] w-[68px] items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r={raio}
            fill="none"
            stroke="var(--superficie-2)"
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={volta}
            strokeDashoffset={volta * (1 - fracao)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <IconeCategoria
          icone={categoria?.icone ?? "Tag"}
          cor={categoria?.cor ?? "#94A3B8"}
          tamanho={36}
        />
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${resta < 0 ? "text-erro" : "text-texto"}`}
      >
        {resta < 0 ? `−${brl0(-resta)}` : brl0(resta)}
      </span>
      <span className="-mt-1 text-[11px] leading-tight text-suave">
        {resta < 0 ? "acima" : "restam"} · {categoria?.nome ?? "Outros"}
      </span>
    </div>
  );
}
