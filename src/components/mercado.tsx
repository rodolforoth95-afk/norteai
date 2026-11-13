import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// Peças visuais do painel de mercado.

export const AVISO_MERCADO =
  "Dados informativos da brapi.dev, com atraso de até 30 minutos. Rankings mostram só variação de preço, não são recomendação.";

export function formatarPreco(v: number | null | undefined, moeda = true) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", moeda ? { style: "currency", currency: "BRL", maximumFractionDigits: Math.abs(v) < 10 && v !== 0 ? 4 : 2 } : { maximumFractionDigits: 2 });
}

export function formatarCompacto(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

export function LogoAtivo({ simbolo, logo, tamanho = 40 }: { simbolo: string; logo: string | null; tamanho?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white" style={{ width: tamanho, height: tamanho }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={tamanho} height={tamanho} className="h-full w-full object-contain p-1" loading="lazy" />
      ) : (
        <span className="font-display text-xs font-bold text-black">{simbolo.slice(0, 4)}</span>
      )}
    </span>
  );
}

export function SeloVariacao({ valor, grande = false }: { valor: number | null; grande?: boolean }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="text-sm text-suave">—</span>;
  const alta = valor > 0;
  const zero = valor === 0;
  const Icone = alta ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-lg font-bold tabular-nums ${grande ? "px-2.5 py-1 text-base" : "px-2 py-0.5 text-xs"} ${
        zero ? "bg-superficie-2 text-suave" : alta ? "bg-menta/15 text-menta" : "bg-erro/15 text-erro"
      }`}
    >
      {zero ? null : <Icone className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />}
      <span>
        {alta ? "+" : ""}
        {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
      </span>
      <span className="sr-only">{alta ? "de alta" : zero ? "estável" : "de baixa"}</span>
    </span>
  );
}

export function LinhaAtivo({
  simbolo,
  nome,
  logo,
  preco,
  variacaoPct,
  posicao,
  href,
}: {
  simbolo: string;
  nome: string;
  logo: string | null;
  preco: number | null;
  variacaoPct: number | null;
  posicao?: number;
  href?: string;
}) {
  return (
    <li>
      <Link href={href ?? `/mercado/${encodeURIComponent(simbolo)}`} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-superficie-2">
        {posicao ? <span className="w-4 text-center font-display text-xs font-bold text-suave">{posicao}</span> : null}
        <LogoAtivo simbolo={simbolo} logo={logo} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold text-texto">{simbolo}</span>
          <span className="block truncate text-xs text-suave">{nome}</span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums text-texto">{formatarPreco(preco)}</span>
          <SeloVariacao valor={variacaoPct} />
        </span>
      </Link>
    </li>
  );
}

export function EsqueletoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <li key={i} className="flex h-16 animate-pulse items-center gap-3 rounded-2xl px-2">
          <span className="h-10 w-10 rounded-xl bg-superficie-2" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-16 rounded bg-superficie-2" />
            <span className="block h-2.5 w-28 rounded bg-superficie-2" />
          </span>
          <span className="h-4 w-14 rounded bg-superficie-2" />
        </li>
      ))}
    </ul>
  );
}
