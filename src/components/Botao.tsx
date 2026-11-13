import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secundario" | "perigo" | "texto";

const ESTILOS: Record<Variante, string> = {
  primario:
    "gradiente-marca font-medium text-white hover:brightness-110 active:brightness-95 disabled:bg-none disabled:bg-superficie-2 disabled:text-suave disabled:shadow-none",
  secundario:
    "border border-linha bg-superficie text-texto shadow-[0_1px_2px_rgb(20_51_82/0.05)] hover:border-violeta hover:bg-superficie-2 disabled:text-suave",
  perigo: "bg-erro text-fundo hover:brightness-110 disabled:bg-superficie-2 disabled:text-suave",
  texto: "text-texto underline underline-offset-4 hover:text-ciano",
};

export function classesBotao(variante: Variante = "primario", larguraTotal = false) {
  const base =
    variante === "texto"
      ? "inline-flex min-h-11 items-center font-medium"
      : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-medium transition disabled:cursor-not-allowed";
  return `${base} ${ESTILOS[variante]} ${larguraTotal ? "w-full" : ""}`;
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  larguraTotal?: boolean;
  carregando?: boolean;
};

export function Botao({
  variante = "primario",
  larguraTotal = false,
  carregando = false,
  className = "",
  children,
  disabled,
  ...resto
}: BotaoProps) {
  return (
    <button
      className={`${classesBotao(variante, larguraTotal)} ${className}`}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? "Aguarde…" : children}
    </button>
  );
}

export function BotaoLink({
  href,
  variante = "primario",
  larguraTotal = false,
  children,
}: {
  href: string;
  variante?: Variante;
  larguraTotal?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classesBotao(variante, larguraTotal)}>
      {children}
    </Link>
  );
}
