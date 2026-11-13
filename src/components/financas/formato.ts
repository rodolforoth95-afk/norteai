export const brl = (v: number, casas = 2) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
export const brl0 = (v: number) => brl(v, 0);

// "1.234,56", "85,5", "85.50", "R$ 1200" → número.
export function lerValor(texto: string): number | null {
  const t = texto.replace(/[^\d.,]/g, "");
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /\.\d{3}$/.test(t) ? t.replace(/\./g, "") : t;
  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function valorParaTexto(v: number | null) {
  return v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const MEIOS = [
  { id: "pix", rotulo: "Pix" },
  { id: "debito", rotulo: "Débito" },
  { id: "credito", rotulo: "Crédito" },
  { id: "dinheiro", rotulo: "Dinheiro" },
  { id: "boleto", rotulo: "Boleto" },
  { id: "transferencia", rotulo: "Transferência" },
] as const;

export function dataCurta(data: string, hoje: string) {
  if (data === hoje) return "Hoje";
  const ontem = new Date(`${hoje}T12:00:00`);
  ontem.setDate(ontem.getDate() - 1);
  if (data === ontem.toISOString().slice(0, 10)) return "Ontem";
  const [a, m, d] = data.split("-");
  return a === hoje.slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${a.slice(2)}`;
}
