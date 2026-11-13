"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { LinhaAtivo } from "@/components/mercado";

type Resultado = { simbolo: string; nome: string; logo: string | null; preco: number | null; variacaoPct: number | null; href?: string };

export function BuscaAtivos() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) {
      setResultados(null);
      return;
    }
    const controle = new AbortController();
    const espera = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await fetch(`/api/mercado/busca?q=${encodeURIComponent(t)}`, { signal: controle.signal });
        const dados = await r.json();
        setResultados(r.ok ? dados.resultados : []);
      } catch {
        // busca cancelada ou sem conexão
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termo]);

  return (
    <div className="relative">
      <label htmlFor="busca-ativos" className="sr-only">
        Buscar ação, FII, ETF, BDR ou cripto
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-suave" aria-hidden="true" />
      <input
        id="busca-ativos"
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar ação, FII, ETF, BDR ou cripto"
        autoComplete="off"
        className="min-h-12 w-full painel pl-12 pr-4 text-base text-texto placeholder:text-suave/70 focus:border-violeta focus:outline-none focus:ring-2 focus:ring-violeta/40"
      />
      {resultados !== null || buscando ? (
        <div className="absolute inset-x-0 top-14 z-30 painel p-2 shadow-2xl" aria-live="polite">
          {buscando && !resultados ? <p className="px-3 py-2 text-sm text-suave">Buscando…</p> : null}
          {resultados?.length === 0 ? <p className="px-3 py-2 text-sm text-suave">Nenhum ativo encontrado.</p> : null}
          <ul className="flex flex-col">
            {resultados?.map((r) => (
              <LinhaAtivo key={r.href ?? r.simbolo} {...r} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
