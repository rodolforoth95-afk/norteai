"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Coins, Lock, Play } from "lucide-react";
import { duracaoVideo, type Video } from "@/lib/conteudo/videos";
import { concluirVideo, desbloquearVideo } from "@/app/acoes";
import { ICONES } from "./icones";
import { PlayerVideo } from "./PlayerVideo";

export function GaleriaVideos({
  videos,
  concluidos,
  desbloqueados,
  saldo,
  formato = "carrossel",
}: {
  videos: Video[];
  concluidos: string[];
  desbloqueados: string[];
  saldo: number;
  formato?: "carrossel" | "grade";
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<Video | null>(null);
  const [comprar, setComprar] = useState<Video | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(v: Video) {
    if (v.custo && !desbloqueados.includes(v.slug)) {
      setErro(null);
      setComprar(v);
      return;
    }
    setAberto(v);
  }

  function confirmarCompra() {
    if (!comprar) return;
    iniciar(async () => {
      const r = await desbloquearVideo(comprar.slug);
      if ("erro" in r && r.erro) return setErro(r.erro);
      const v = comprar;
      setComprar(null);
      router.refresh();
      setAberto(v);
    });
  }

  return (
    <>
      <ul className={formato === "carrossel" ? "-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]" : "grid grid-cols-2 gap-3"}>
        {videos.map((v) => {
          const Icone = ICONES[v.cenas[0].icone ?? "alvo"];
          const bloqueado = Boolean(v.custo) && !desbloqueados.includes(v.slug);
          const visto = concluidos.includes(`video:${v.slug}`);
          return (
            <li key={v.slug} className={formato === "carrossel" ? "w-40 shrink-0 snap-start" : ""}>
              <button
                type="button"
                onClick={() => abrir(v)}
                className="group relative flex aspect-[9/14] w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 p-3 text-left"
                style={{ background: `linear-gradient(160deg, ${v.cores[0]}, ${v.cores[1]})` }}
              >
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
                <span className="relative flex items-center justify-between">
                  <span className="rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white">{duracaoVideo(v)} s</span>
                  {visto ? (
                    <CheckCircle2 className="h-5 w-5 text-white" aria-label="Assistido" />
                  ) : bloqueado ? (
                    <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-ambar">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {v.custo}
                    </span>
                  ) : null}
                </span>
                <Icone className="relative mx-auto h-12 w-12 text-white/90 transition group-hover:scale-110" strokeWidth={1.5} aria-hidden="true" />
                <span className="relative">
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-fundo">
                    {bloqueado ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="block font-display text-sm font-semibold leading-tight text-white">{v.titulo}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-white/80">{v.chamada}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {comprar ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Desbloquear ${comprar.titulo}`}>
          <div className="w-full max-w-md painel p-6">
            <p className="text-sm text-suave">Treinamento exclusivo</p>
            <p className="mt-1 font-display text-xl font-bold text-texto">{comprar.titulo}</p>
            <p className="mt-2 text-sm text-suave">{comprar.chamada}</p>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-superficie-2 px-4 py-3 text-sm">
              <span className="text-suave">Custo</span>
              <span className="flex items-center gap-1 font-bold text-ambar">
                <Coins className="h-4 w-4" aria-hidden="true" />
                {comprar.custo} coins
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between px-4 text-sm">
              <span className="text-suave">Seu saldo</span>
              <span className="font-medium text-texto">{saldo} coins</span>
            </div>
            {erro ? <p className="mt-3 text-sm text-erro" role="alert">{erro}</p> : null}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmarCompra}
                disabled={pendente || saldo < (comprar.custo ?? 0)}
                className="gradiente-marca min-h-12 rounded-2xl font-medium text-white disabled:opacity-50"
              >
                {saldo < (comprar.custo ?? 0) ? `Faltam ${(comprar.custo ?? 0) - saldo} coins` : pendente ? "Aguarde…" : "Desbloquear"}
              </button>
              <button type="button" onClick={() => setComprar(null)} className="min-h-12 rounded-2xl border border-linha font-medium text-texto">
                Agora não
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aberto ? (
        <PlayerVideo
          video={aberto}
          aoFechar={() => {
            setAberto(null);
            router.refresh();
          }}
          aoConcluir={async () => (await concluirVideo(aberto.slug)).moedas}
        />
      ) : null}
    </>
  );
}
