"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { salvarConfigWhatsApp } from "@/app/acoes-whatsapp";

export function ConfigAtendimento({
  atendimento,
  mensagemPausa,
}: {
  atendimento: boolean;
  mensagemPausa: string;
}) {
  const router = useRouter();
  const [ligado, setLigado] = useState(atendimento);
  const [mensagem, setMensagem] = useState(mensagemPausa);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    setAviso(null);
    const r = await salvarConfigWhatsApp(ligado, mensagem);
    setSalvando(false);
    if ("erro" in r)
      return setAviso({ ok: false, texto: r.erro ?? "Não foi possível salvar." });
    setAviso({ ok: true, texto: "Salvo." });
    router.refresh();
  }

  return (
    <div className="painel flex flex-col gap-4 p-5">
      <label className="flex items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="font-semibold text-texto">
            Mordomo respondendo os clientes
          </span>
          <span className="text-sm text-suave">
            {ligado
              ? "Ligado: lança despesas e receitas e responde as perguntas."
              : "Pausado: todo cliente recebe só a mensagem de pausa abaixo."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={ligado}
          onChange={(e) => setLigado(e.target.checked)}
          className="h-6 w-6 accent-ciano"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-texto">
        Mensagem de pausa (opcional)
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="O atendimento do Findomo pelo WhatsApp está em pausa por alguns instantes. Enquanto isso, use o site."
          className="rounded-xl border border-linha bg-superficie p-3 text-base font-normal text-texto outline-none focus:border-ciano"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="gradiente-marca flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          Salvar
        </button>
        {aviso ? (
          <span
            className={`text-sm ${aviso.ok ? "text-menta" : "text-gravata"}`}
          >
            {aviso.texto}
          </span>
        ) : null}
      </div>
    </div>
  );
}
