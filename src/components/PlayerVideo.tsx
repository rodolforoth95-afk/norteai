"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import type { Cena, Video } from "@/lib/conteudo/videos";
import { ICONES } from "./icones";
import { TEXTO_AVISO } from "./AvisoEducacional";

const PASSO_MS = 100;

// Vídeo curto vertical (9:16), animado no próprio app, com legenda e narração opcional.
export function PlayerVideo({
  video,
  aoFechar,
  aoConcluir,
}: {
  video: Video;
  aoFechar: () => void;
  aoConcluir?: () => Promise<number>; // devolve as coins ganhas
}) {
  const [indice, setIndice] = useState(0);
  const [tempo, setTempo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [som, setSom] = useState(false);
  const [fim, setFim] = useState(false);
  const [moedas, setMoedas] = useState<number | null>(null);
  const concluiu = useRef(false);
  const fechar = useRef<HTMLButtonElement>(null);

  const cena = video.cenas[indice];
  const duracaoCena = cena.seg * 1000;

  const irPara = useCallback(
    (i: number) => {
      if (i < 0) i = 0;
      if (i >= video.cenas.length) {
        setFim(true);
        return;
      }
      setIndice(i);
      setTempo(0);
    },
    [video.cenas.length],
  );

  // Relógio da cena.
  useEffect(() => {
    if (pausado || fim) return;
    const t = setInterval(() => setTempo((v) => v + PASSO_MS), PASSO_MS);
    return () => clearInterval(t);
  }, [pausado, fim]);

  useEffect(() => {
    if (tempo >= duracaoCena) irPara(indice + 1);
  }, [tempo, duracaoCena, indice, irPara]);

  // Narração pela voz do aparelho (Web Speech API).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!som || fim || pausado) return;
    const fala = new SpeechSynthesisUtterance(cena.narracao ?? `${cena.titulo}. ${cena.texto}`);
    fala.lang = "pt-BR";
    fala.rate = 1.08;
    const voz = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("pt"));
    if (voz) fala.voice = voz;
    window.speechSynthesis.speak(fala);
    return () => window.speechSynthesis.cancel();
  }, [indice, som, fim, pausado, cena]);

  // Fim do vídeo: registra a conclusão (coins).
  useEffect(() => {
    if (!fim || concluiu.current) return;
    concluiu.current = true;
    aoConcluir?.().then(setMoedas).catch(() => setMoedas(0));
  }, [fim, aoConcluir]);

  // Teclado e foco.
  useEffect(() => {
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "ArrowRight") irPara(indice + 1);
      if (e.key === "ArrowLeft") irPara(indice - 1);
      if (e.key === " ") {
        e.preventDefault();
        setPausado((p) => !p);
      }
    };
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [aoFechar, irPara, indice]);

  function recomecar() {
    setFim(false);
    irPara(0);
    setPausado(false);
  }

  const [c1, c2] = video.cores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={video.titulo}>
      <div
        className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden sm:h-[min(92dvh,820px)] sm:rounded-[2rem]"
        style={{ background: `radial-gradient(120% 70% at 20% 0%, ${c1}55, transparent 60%), radial-gradient(120% 70% at 100% 100%, ${c2}55, transparent 60%), #000000` }}
      >
        {/* Barras de progresso por cena */}
        <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {video.cenas.map((c, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: fim || i < indice ? "100%" : i === indice ? `${Math.min(100, (tempo / duracaoCena) * 100)}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="flex-1">
            <p className="font-display text-sm font-semibold text-white">{video.titulo}</p>
            <p className="text-xs text-white/70">norte.ia · aprenda em 1 minuto</p>
          </div>
          <button type="button" onClick={() => setSom((s) => !s)} aria-label={som ? "Desligar narração" : "Ligar narração"} aria-pressed={som} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            {som ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button ref={fechar} type="button" onClick={aoFechar} aria-label="Fechar vídeo" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {fim ? (
          <TelaFinal moedas={moedas} aoRecomecar={recomecar} aoFechar={aoFechar} cores={video.cores} />
        ) : (
          <>
            {/* Áreas de toque: esquerda volta, direita avança */}
            <button type="button" aria-label="Cena anterior" className="absolute bottom-28 left-0 top-28 z-10 w-1/3" onClick={() => irPara(indice - 1)} />
            <button type="button" aria-label="Próxima cena" className="absolute bottom-28 right-0 top-28 z-10 w-1/3" onClick={() => irPara(indice + 1)} />

            <div key={indice} className="flex flex-1 flex-col justify-center px-6">
              <Visual cena={cena} cores={video.cores} />
            </div>

            <div key={`t${indice}`} className="px-6 pb-4">
              <p className="animate-subir font-display text-2xl font-bold leading-tight text-white">{cena.titulo}</p>
              <p className="mt-2 animate-subir text-base leading-relaxed text-white/85 [animation-delay:120ms]">{cena.texto}</p>
            </div>

            <div className="flex items-center gap-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setPausado((p) => !p)} aria-label={pausado ? "Continuar" : "Pausar"} className="relative z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-fundo">
                {pausado ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
              </button>
              <p className="text-[11px] leading-snug text-white/60">{TEXTO_AVISO}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Visual({ cena, cores }: { cena: Cena; cores: [string, string] }) {
  const [c1, c2] = cores;
  const gradiente = `linear-gradient(135deg, ${c1}, ${c2})`;

  if (cena.tipo === "numero") {
    return (
      <p
        className="animate-subir text-center font-display text-6xl font-bold leading-none"
        style={{ backgroundImage: gradiente, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
      >
        {cena.numero}
      </p>
    );
  }

  if (cena.tipo === "lista") {
    return (
      <ul className="flex flex-col gap-3">
        {cena.itens?.map((item, i) => (
          <li key={item} className="flex animate-subir items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base font-medium text-white backdrop-blur" style={{ animationDelay: `${300 + i * 450}ms` }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white" style={{ background: gradiente }}>
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (cena.tipo === "grafico" && cena.serie) {
    const s = cena.serie;
    const min = Math.min(...s);
    const max = Math.max(...s);
    const pontos = s.map((v, i) => `${(i / (s.length - 1)) * 300},${150 - ((v - min) / (max - min || 1)) * 130 - 10}`).join(" ");
    return (
      <svg viewBox="0 0 300 160" className="w-full" aria-hidden="true">
        <defs>
          <linearGradient id="linha-video" x1="0" x2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {[40, 80, 120].map((y) => (
          <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="white" strokeOpacity="0.1" />
        ))}
        <polyline points={pontos} fill="none" stroke="url(#linha-video)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1">
          <animate attributeName="stroke-dashoffset" from="1" to="0" dur="2.4s" fill="freeze" />
        </polyline>
      </svg>
    );
  }

  if (cena.tipo === "barras" && cena.barras) {
    const max = Math.max(...cena.barras.map((b) => b.valor));
    return (
      <div className="flex h-56 items-end justify-around gap-3">
        {cena.barras.map((b, i) => (
          <div key={b.rotulo} className="flex flex-1 flex-col items-center gap-2">
            <span className="animate-subir font-display text-sm font-bold text-white" style={{ animationDelay: `${600 + i * 250}ms` }}>
              {cena.prefixo ?? ""}
              {b.valor.toLocaleString("pt-BR")}
              {cena.sufixo ?? ""}
            </span>
            <div className="w-full origin-bottom rounded-t-xl" style={{ height: `${(b.valor / max) * 160}px`, background: gradiente, animation: `crescer 0.9s ${i * 0.25}s ease-out both` }} />
            <span className="text-xs text-white/75">{b.rotulo}</span>
          </div>
        ))}
        <style>{`@keyframes crescer{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
      </div>
    );
  }

  const Icone = ICONES[cena.icone ?? "alvo"];
  const alerta = cena.tipo === "alerta";
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <div className="absolute inset-0 animate-brilho rounded-full blur-2xl" style={{ background: alerta ? "#FF6B00" : gradiente }} />
      <div className="relative flex h-32 w-32 animate-subir items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur">
        <Icone className="h-16 w-16 text-white" strokeWidth={1.5} aria-hidden="true" />
      </div>
    </div>
  );
}

function TelaFinal({
  moedas,
  aoRecomecar,
  aoFechar,
  cores,
}: {
  moedas: number | null;
  aoRecomecar: () => void;
  aoFechar: () => void;
  cores: [string, string];
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-24 w-24 animate-subir items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${cores[0]}, ${cores[1]})` }}>
        <Coins className="h-12 w-12 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-white">Vídeo concluído!</p>
        <p className="mt-2 text-white/80" aria-live="polite">
          {moedas === null ? "Registrando seu progresso…" : moedas > 0 ? `Você ganhou +${moedas} coins.` : "Você já tinha ganhado as coins deste vídeo."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <button type="button" onClick={aoFechar} className="min-h-12 rounded-2xl bg-white font-medium text-fundo">
          Continuar
        </button>
        <button type="button" onClick={aoRecomecar} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 font-medium text-white">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Assistir de novo
        </button>
      </div>
    </div>
  );
}
