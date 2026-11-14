"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { CATEGORIAS_RADAR, type EventoRadar } from "@/lib/conteudo/radar";

const IMPACTO = { alto: { rotulo: "Alto impacto", cor: "bg-gravata" }, medio: { rotulo: "Médio", cor: "bg-ciano" }, baixo: { rotulo: "Baixo", cor: "bg-suave" } } as const;
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];

function segundaDe(data: string) {
  const d = new Date(`${data}T12:00:00`);
  const dia = d.getDay() || 7;
  d.setDate(d.getDate() - dia + 1);
  return d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Agenda da semana: dias úteis no topo, abas Expectativas/Fechamentos e filtro por tema.
export function AgendaRadar({ eventos, hoje }: { eventos: EventoRadar[]; hoje: string }) {
  const [deslocamento, setDeslocamento] = useState(0);
  const [aba, setAba] = useState<"expectativa" | "fechamento">("expectativa");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);

  const dias = useMemo(() => {
    const seg = segundaDe(hoje);
    seg.setDate(seg.getDate() + deslocamento * 7);
    return DIAS.map((rotulo, i) => {
      const d = new Date(seg);
      d.setDate(seg.getDate() + i);
      return { rotulo, data: iso(d), numero: d.getDate() };
    });
  }, [hoje, deslocamento]);

  const daSemana = eventos.filter((e) => e.data >= dias[0].data && e.data <= dias[4].data);
  const lista = daSemana
    .filter((e) => e.tipo === aba && (!categoria || e.categoria === categoria) && (!diaEscolhido || e.data === diaEscolhido))
    .sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? "")));
  const titulo = deslocamento === 0 ? "Esta semana" : deslocamento === -1 ? "Semana passada" : deslocamento === 1 ? "Próxima semana" : `${dias[0].data.split("-").reverse().slice(0, 2).join("/")} a ${dias[4].data.split("-").reverse().slice(0, 2).join("/")}`;

  return (
    <div className="painel flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-texto">
          <CalendarDays className="h-5 w-5 text-ciano" aria-hidden="true" /> {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setDeslocamento((d) => d - 1); setDiaEscolhido(null); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-linha text-suave hover:text-texto" aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => { setDeslocamento(0); setDiaEscolhido(null); }} className="h-9 rounded-full border border-linha px-3 text-xs font-semibold text-texto">
            Hoje
          </button>
          <button type="button" onClick={() => { setDeslocamento((d) => d + 1); setDiaEscolhido(null); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-linha text-suave hover:text-texto" aria-label="Próxima semana">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {dias.map((d) => {
          const qtd = daSemana.filter((e) => e.data === d.data).length;
          const ativo = diaEscolhido === d.data;
          const ehHoje = d.data === hoje;
          return (
            <button
              key={d.data}
              type="button"
              onClick={() => setDiaEscolhido(ativo ? null : d.data)}
              aria-pressed={ativo}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition ${ativo ? "degrade-ativo border-transparent text-white" : ehHoje ? "border-ciano text-texto" : "border-linha text-texto hover:bg-superficie-2"}`}
            >
              <span className={`text-[11px] font-semibold uppercase ${ativo ? "text-white/80" : "text-suave"}`}>{d.rotulo}</span>
              <span className="font-display text-lg font-semibold tabular-nums">{d.numero}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${qtd ? (ativo ? "bg-white" : "bg-gravata") : "bg-transparent"}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-linha bg-superficie-2 p-1" role="radiogroup" aria-label="Tipo">
          {(
            [
              ["expectativa", "Expectativas"],
              ["fechamento", "Fechamentos"],
            ] as const
          ).map(([id, rotulo]) => (
            <button key={id} type="button" role="radio" aria-checked={aba === id} onClick={() => setAba(id)} className={`min-h-8 rounded-full px-4 text-xs font-semibold ${aba === id ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}>
              {rotulo}
            </button>
          ))}
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {CATEGORIAS_RADAR.map((c) => (
            <button key={c} type="button" onClick={() => setCategoria(categoria === c ? null : c)} className={`min-h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${categoria === c ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {lista.length ? (
        <ul className="divide-y divide-linha">
          {lista.map((e) => (
            <li key={e.id} className="flex gap-4 py-3.5">
              <div className="w-14 shrink-0 text-center">
                <p className="text-xs font-semibold uppercase text-suave">{DIAS[(new Date(`${e.data}T12:00:00`).getDay() || 7) - 1]}</p>
                <p className="flex items-center justify-center gap-1 text-xs tabular-nums text-suave">
                  <Clock className="h-3 w-3" aria-hidden="true" /> {e.hora ?? "—"}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-texto">{e.titulo}</span>
                  <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] text-suave">{e.categoria}</span>
                  <span className="flex items-center gap-1 text-[11px] text-suave">
                    <span className={`h-2 w-2 rounded-full ${IMPACTO[e.impacto].cor}`} aria-hidden="true" />
                    {IMPACTO[e.impacto].rotulo}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-suave">{e.resumo}</p>
                {e.esperado || e.resultado ? (
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {e.esperado ? (
                      <span className="text-suave">
                        Esperado: <span className="font-semibold text-texto">{e.esperado}</span>
                      </span>
                    ) : null}
                    {e.resultado ? (
                      <span className="text-suave">
                        Resultado: <span className="font-semibold text-ciano">{e.resultado}</span>
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-linha px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-suave" aria-hidden="true" />
          <p className="font-semibold text-texto">{aba === "expectativa" ? "Agenda da semana em preparação" : "Fechamento da semana em preparação"}</p>
          <p className="max-w-sm text-sm text-suave">
            {aba === "expectativa" ? "Aqui entram as divulgações da semana (Copom, IPCA, resultados de empresas) com o que o mercado espera." : "Aqui entra o resumo do que saiu acima ou abaixo do esperado e o que isso muda."}
          </p>
        </div>
      )}
    </div>
  );
}
