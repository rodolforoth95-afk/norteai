import { useId } from "react";

type Props = { tamanho?: "md" | "lg" };

export function Estrela({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="50%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFB800" />
        </linearGradient>
      </defs>
      <polygon points="24,2 28,20 24,24 20,20" fill="#FFFFFF" />
      <polygon points="28,20 46,24 28,28 24,46 20,28 2,24 20,20 24,24" fill={`url(#${id})`} />
    </svg>
  );
}

export function Logo({ tamanho = "md" }: Props) {
  const grande = tamanho === "lg";
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label="norte.ia">
      <Estrela className={grande ? "h-10 w-10" : "h-7 w-7"} />
      <span
        aria-hidden="true"
        className={`font-display font-bold tracking-tight text-texto ${grande ? "text-3xl" : "text-xl"}`}
      >
        norte<span className="texto-gradiente">.ia</span>
      </span>
    </span>
  );
}
