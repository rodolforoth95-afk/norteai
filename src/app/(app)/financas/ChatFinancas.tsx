"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Mascote } from "@/components/Logo";

type Mensagem = { papel: "usuario" | "assistente"; texto: string };

const SUGESTOES = [
  "Como estou este mês?",
  "Onde mais gasto?",
  "Quanto gastei com delivery?",
  "Como bater minha meta?",
  "Quais são minhas assinaturas?",
];

// Assistente de finanças: conversa curta sobre os lançamentos da própria pessoa.
export function ChatFinancas({ primeiroNome }: { primeiroNome: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lista.current?.scrollTo({
      top: lista.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensagens, enviando]);

  async function enviar(conteudo: string) {
    const limpo = conteudo.trim();
    if (!limpo || enviando) return;
    const novas = [...mensagens, { papel: "usuario" as const, texto: limpo }];
    setMensagens(novas);
    setTexto("");
    setEnviando(true);
    const r = await fetch("/api/financas/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagens: novas.slice(-20) }),
    }).catch(() => null);
    const corpo = await r?.json().catch(() => null);
    setEnviando(false);
    setMensagens([
      ...novas,
      {
        papel: "assistente",
        texto: r?.ok
          ? corpo.texto
          : (corpo?.erro ?? "Não consegui responder agora. Tente de novo."),
      },
    ]);
  }

  return (
    <div className="painel flex h-full min-h-[22rem] flex-col p-0">
      <div className="flex items-center gap-3 border-b border-linha px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-superficie-2">
          <Mascote className="h-6 w-6" piscando />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-texto">
            Sua assistente financeira
          </h2>
          <p className="flex items-center gap-1 text-xs text-suave">
            <Sparkles className="h-3 w-3 text-ciano" aria-hidden="true" />{" "}
            Conhece todos os seus lançamentos
          </p>
        </div>
      </div>

      <div
        ref={lista}
        className="flex max-h-[22rem] min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
        aria-live="polite"
      >
        {mensagens.length ? (
          mensagens.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.papel === "usuario" ? "degrade-ativo self-end rounded-br-md text-white" : "self-start rounded-bl-md bg-superficie-2 text-texto"}`}
            >
              {m.texto}
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-texto">
              Olá{primeiroNome ? `, ${primeiroNome}` : ""}. Pergunte o que
              quiser sobre o seu dinheiro: gastos, sobra, assinaturas ou a sua
              meta.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border border-linha px-3 py-1.5 text-xs font-medium text-texto hover:border-ciano hover:bg-superficie-2"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {enviando ? (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-superficie-2 px-3.5 py-2.5 text-sm text-suave">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Pensando…
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
        className="flex items-center gap-2 border-t border-linha p-3"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Pergunte sobre suas finanças…"
          aria-label="Pergunta"
          className="h-11 min-w-0 flex-1 rounded-full border border-linha bg-superficie-2 px-4 text-sm text-texto outline-none placeholder:text-suave/70 focus:border-ciano"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="gradiente-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
          aria-label="Enviar"
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
