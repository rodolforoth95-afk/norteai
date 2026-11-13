type Props = { tamanho?: "sm" | "md" | "lg" };

// Mascote Findomo: um balão de conversa com rosto (a IA) e gravata-borboleta (o mordomo).
// As cores acompanham o tema: balão azul no modo claro, balão branco no modo noite.
export function Mascote({ className = "h-8 w-8", sorriso = true, piscando = false }: { className?: string; sorriso?: boolean; piscando?: boolean }) {
  const olhos = piscando ? "animate-piscar origin-[50px_32px]" : undefined;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect x="18" y="10" width="64" height="52" rx="20" style={{ fill: "var(--mascote-balao)" }} />
      <g className={olhos}>
        <rect x="35" y="26" width="8" height="12" rx="4" style={{ fill: "var(--mascote-rosto)" }} />
        <rect x="57" y="26" width="8" height="12" rx="4" style={{ fill: "var(--mascote-rosto)" }} />
      </g>
      {sorriso ? (
        <path d="M40 46 Q50 53 60 46" fill="none" strokeWidth="4" strokeLinecap="round" style={{ stroke: "var(--mascote-rosto)" }} />
      ) : null}
      <path d="M30 68 L47 75 L30 82 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="3" strokeLinejoin="round" />
      <path d="M70 68 L53 75 L70 82 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="75" r="5" style={{ fill: "var(--mascote-no)" }} />
    </svg>
  );
}

// Ícone do app: quadrado azul com o mascote branco (sem sorriso, olhos maiores).
export function IconeApp({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-[24%] bg-[#2D5BFF] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-[75%] w-[75%]">
        <rect x="14" y="8" width="72" height="56" rx="22" fill="#FFFFFF" />
        <rect x="33" y="24" width="10" height="16" rx="5" fill="#2D5BFF" />
        <rect x="57" y="24" width="10" height="16" rx="5" fill="#2D5BFF" />
        <path d="M28 70 L48 78 L28 86 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="4" strokeLinejoin="round" />
        <path d="M72 70 L52 78 L72 86 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ tamanho = "md" }: Props) {
  const mascote = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" }[tamanho];
  const texto = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" }[tamanho];
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label="findomo">
      <Mascote className={mascote} piscando />
      <span aria-hidden="true" className={`font-marca font-black tracking-[-0.03em] text-texto ${texto}`}>
        fin<span className="text-ciano">domo</span>
      </span>
    </span>
  );
}
