"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Coins, Lock, RotateCcw, XCircle } from "lucide-react";
import { Botao } from "@/components/Botao";
import { responderQuiz } from "@/app/acoes";

type Correcao = { acertou: boolean; correta: number; explicacao: string };

export function QuizModulo({
  modulo,
  perguntas,
  aprovado,
  liberado,
}: {
  modulo: string;
  perguntas: { pergunta: string; opcoes: string[] }[];
  aprovado: boolean;
  liberado: boolean;
}) {
  const router = useRouter();
  const [respostas, setRespostas] = useState<(number | null)[]>(perguntas.map(() => null));
  const [resultado, setResultado] = useState<{ acertos: number; total: number; aprovado: boolean; moedas: number; correcao: Correcao[] } | null>(null);
  const [pendente, iniciar] = useTransition();

  if (!liberado && !aprovado) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-linha p-5 text-sm text-suave">
        <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
        Conclua metade das aulas para liberar o quiz do módulo.
      </div>
    );
  }

  function enviar() {
    if (respostas.some((r) => r === null)) return;
    iniciar(async () => {
      const r = await responderQuiz(modulo, respostas as number[]);
      if ("erro" in r) return;
      setResultado(r);
      router.refresh();
    });
  }

  return (
    <div className="borda-gradiente flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-texto">Quiz do módulo</h2>
        {aprovado && !resultado ? <span className="flex items-center gap-1 text-sm font-semibold text-menta"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Aprovado</span> : <span className="text-xs text-ambar">+30 coins</span>}
      </div>

      {perguntas.map((q, i) => {
        const c = resultado?.correcao[i];
        return (
          <fieldset key={q.pergunta} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-texto">
              {i + 1}. {q.pergunta}
            </legend>
            {q.opcoes.map((o, j) => {
              const escolhida = respostas[i] === j;
              const estado = c ? (j === c.correta ? "certa" : escolhida ? "errada" : "neutra") : escolhida ? "escolhida" : "neutra";
              return (
                <label
                  key={o}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2 text-sm transition ${
                    estado === "certa"
                      ? "border-menta bg-menta/10 text-texto"
                      : estado === "errada"
                        ? "border-erro bg-erro/10 text-texto"
                        : estado === "escolhida"
                          ? "border-violeta bg-violeta/10 text-texto"
                          : "border-linha text-texto hover:border-violeta"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    className="accent-violeta"
                    checked={escolhida}
                    disabled={Boolean(resultado)}
                    onChange={() => setRespostas((r) => r.map((v, k) => (k === i ? j : v)))}
                  />
                  {o}
                  {estado === "certa" ? <CheckCircle2 className="ml-auto h-4 w-4 text-menta" aria-label="Resposta correta" /> : null}
                  {estado === "errada" ? <XCircle className="ml-auto h-4 w-4 text-erro" aria-label="Resposta errada" /> : null}
                </label>
              );
            })}
            {c ? <p className="text-xs leading-relaxed text-suave">{c.explicacao}</p> : null}
          </fieldset>
        );
      })}

      {resultado ? (
        <div className="flex flex-col gap-3" role="status">
          <p className={`font-display text-lg font-semibold ${resultado.aprovado ? "text-menta" : "text-ambar"}`}>
            {resultado.acertos} de {resultado.total} acertos · {resultado.aprovado ? "módulo concluído!" : "faltou pouco"}
          </p>
          {resultado.moedas ? (
            <p className="inline-flex items-center gap-2 self-start rounded-full border border-ambar/40 bg-ambar/10 px-3 py-1 text-sm font-medium text-ambar">
              <Coins className="h-4 w-4" aria-hidden="true" />+{resultado.moedas} coins
            </p>
          ) : null}
          <Botao
            variante="secundario"
            onClick={() => {
              setResultado(null);
              setRespostas(perguntas.map(() => null));
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Refazer quiz
          </Botao>
        </div>
      ) : (
        <Botao larguraTotal onClick={enviar} carregando={pendente} disabled={respostas.some((r) => r === null)}>
          Corrigir respostas
        </Botao>
      )}
    </div>
  );
}
