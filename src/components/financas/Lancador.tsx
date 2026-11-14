"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ImageUp,
  Keyboard,
  Loader2,
  Mic,
  Minus,
  Plus,
  Square,
  X,
} from "lucide-react";
import { lerTextoComprovante, sugerirCategoria } from "@/lib/dominio/financas";
import {
  FormLancamento,
  type ContextoLancamento,
  type ValoresLancamento,
} from "./FormLancamento";

type Modo = "texto" | "camera" | "voz";
type Previa = Omit<ValoresLancamento, "recorrente" | "origem"> & {
  categoriaAprendida: boolean;
  confianca: number;
  viaIA: boolean;
};

type Lancador = {
  abrir: (modo: Modo, inicial?: Partial<ValoresLancamento>) => void;
};
const ContextoLancador = createContext<Lancador>({ abrir: () => {} });
export const useLancador = () => useContext(ContextoLancador);

type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function criarReconhecimento(): Reconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Reconhecimento;
    webkitSpeechRecognition?: new () => Reconhecimento;
  };
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

// Lançador global: o botão flutuante (em qualquer tela do app) abre Texto, Câmera ou
// Microfone. Foto e voz viram uma prévia que a pessoa confere e salva em um clique.
export function ProvedorLancador({
  contexto,
  ia,
  children,
}: {
  contexto: ContextoLancamento;
  ia: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const naFinancas = usePathname() === "/financas";
  const [aberto, setAberto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [modo, setModo] = useState<Modo>("texto");
  const [inicial, setInicial] = useState<ValoresLancamento | null>(null);
  const [destaque, setDestaque] = useState<{
    titulo: string;
    texto: string;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [chave, setChave] = useState(0);

  const vazio = useCallback(
    (origem: ValoresLancamento["origem"] = "manual"): ValoresLancamento => ({
      tipo: "despesa",
      valor: null,
      data: contexto.hoje,
      descricao: "",
      estabelecimento: null,
      categoriaId: null,
      meio: null,
      parcelas: 1,
      recorrente: false,
      origem,
    }),
    [contexto.hoje],
  );

  const abrir = useCallback(
    (m: Modo, valores?: Partial<ValoresLancamento>) => {
      setMenu(false);
      setModo(m);
      setDestaque(null);
      setInicial(m === "texto" ? { ...vazio(), ...valores } : null);
      setChave((k) => k + 1);
      setAberto(true);
    },
    [vazio],
  );

  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (!aberto && !menu) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        setMenu(false);
      }
    };
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [aberto, menu]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3800);
    return () => clearTimeout(t);
  }, [aviso]);

  function receberPrevia(p: Previa, origem: "foto" | "audio") {
    setInicial({ ...p, recorrente: false, origem });
    const confere = !p.valor
      ? "Não achei o total: digite o valor e confira o resto."
      : p.confianca < 0.6
        ? "Confira o valor antes de salvar."
        : p.categoriaAprendida
          ? "Categoria escolhida pelo que você costuma usar."
          : "Confira e salve.";
    setDestaque({
      titulo:
        origem === "foto"
          ? "Lido da foto"
          : p.viaIA
            ? "Entendi assim"
            : "Entendi assim (leitura local)",
      texto: confere,
    });
    setChave((k) => k + 1);
  }

  function salvo(mensagem: string) {
    setAberto(false);
    setAviso(mensagem);
    router.refresh();
  }

  const titulo = inicial?.id
    ? "Editar lançamento"
    : modo === "camera" && !inicial
      ? "Ler comprovante"
      : modo === "voz" && !inicial
        ? "Falar o lançamento"
        : "Novo lançamento";

  return (
    <ContextoLancador.Provider value={{ abrir }}>
      {children}

      {/* Em Finanças: barra fixa embaixo com Receita e Despesa (mais claro que o botão +) */}
      {naFinancas ? (
        <div className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-6 lg:left-[4.5rem] lg:menu-aberto:left-60">
          <div className="flex w-full max-w-md items-center gap-1.5 rounded-full border border-linha bg-superficie/95 p-1.5 shadow-[0_18px_44px_-14px_rgb(0_0_0/0.45)] backdrop-blur">
            <button
              type="button"
              onClick={() => abrir("texto", { tipo: "receita" })}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-menta/12 text-sm font-semibold text-texto transition hover:bg-menta/20 active:scale-[0.98]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-menta text-white">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
              Receita
            </button>
            <button
              type="button"
              onClick={() => abrir("texto", { tipo: "despesa" })}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-erro/12 text-sm font-semibold text-texto transition hover:bg-erro/20 active:scale-[0.98]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-erro text-white">
                <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
              Despesa
            </button>
            <span className="mx-0.5 h-7 w-px bg-linha" aria-hidden="true" />
            <button type="button" onClick={() => abrir("camera")} aria-label="Lançar pela foto do comprovante" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ciano hover:bg-superficie-2">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => abrir("voz")} aria-label="Lançar falando" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ciano hover:bg-superficie-2">
              <Mic className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Botão flutuante e suas três opções */}
      {menu && !naFinancas ? (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-[rgb(3_6_20/0.35)] backdrop-blur-[2px]"
          aria-label="Fechar opções"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <div className={`fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex-col items-end gap-2.5 lg:bottom-8 lg:right-8 ${naFinancas ? "hidden" : "flex"}`}>
        {menu ? (
          <>
            {[
              {
                m: "voz" as const,
                rotulo: "Falar",
                sub: "“Gastei 85 no almoço”",
                Icone: Mic,
              },
              {
                m: "camera" as const,
                rotulo: "Foto do comprovante",
                sub: "Nota, cupom ou Pix",
                Icone: Camera,
              },
              {
                m: "texto" as const,
                rotulo: "Digitar",
                sub: "Formulário rápido",
                Icone: Keyboard,
              },
            ].map(({ m, rotulo, sub, Icone }, i) => (
              <button
                key={m}
                type="button"
                onClick={() => abrir(m)}
                className="animate-subir flex items-center gap-3 rounded-2xl border border-linha bg-superficie py-2 pl-4 pr-2 text-left shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)]"
                style={{ animationDelay: `${(2 - i) * 40}ms` }}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-texto">
                    {rotulo}
                  </span>
                  <span className="text-xs text-suave">{sub}</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-superficie-2 text-ciano">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
              </button>
            ))}
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          aria-label={menu ? "Fechar opções de lançamento" : "Novo lançamento"}
          className="gradiente-marca flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_34px_-10px_rgb(45_91_255/0.75)] transition hover:brightness-110 active:scale-95"
        >
          <Plus
            className={`h-7 w-7 transition-transform ${menu ? "rotate-45" : ""}`}
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Aviso de lançamento salvo */}
      {aviso ? (
        <div
          role="status"
          className="animate-subir fixed inset-x-4 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-linha bg-superficie px-4 py-3 text-sm shadow-[0_18px_44px_-14px_rgb(0_0_0/0.5)] lg:bottom-28"
        >
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-menta"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-texto">{aviso}</span>
        </div>
      ) : null}

      {/* Janela */}
      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-lancador"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[rgb(3_6_20/0.55)] backdrop-blur-sm"
            aria-label="Fechar"
            onClick={fechar}
          />
          <div className="animate-subir relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-linha bg-superficie shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] sm:max-w-lg sm:rounded-[1.75rem]">
            <div className="flex items-center justify-between gap-3 border-b border-linha px-5 py-3.5">
              <h2
                id="titulo-lancador"
                className="font-display text-lg font-bold text-texto"
              >
                {titulo}
              </h2>
              <div className="flex items-center gap-1">
                {!inicial?.id
                  ? (
                      [
                        {
                          m: "texto" as const,
                          Icone: Keyboard,
                          rotulo: "Digitar",
                        },
                        { m: "camera" as const, Icone: Camera, rotulo: "Foto" },
                        { m: "voz" as const, Icone: Mic, rotulo: "Falar" },
                      ] as const
                    ).map(({ m, Icone, rotulo }) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => abrir(m)}
                        aria-label={rotulo}
                        aria-pressed={modo === m}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${modo === m ? "bg-superficie-2 text-ciano" : "text-suave hover:text-texto"}`}
                      >
                        <Icone
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        />
                      </button>
                    ))
                  : null}
                <button
                  type="button"
                  onClick={fechar}
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              {inicial ? (
                <FormLancamento
                  key={chave}
                  contexto={contexto}
                  inicial={inicial}
                  destaque={destaque}
                  aoSalvar={salvo}
                />
              ) : modo === "camera" ? (
                <LerFoto
                  ia={ia}
                  contexto={contexto}
                  aoLer={(p) => receberPrevia(p, "foto")}
                />
              ) : (
                <Falar aoLer={(p) => receberPrevia(p, "audio")} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </ContextoLancador.Provider>
  );
}

// Lê o texto da imagem no próprio aparelho (sem enviar a foto) e interpreta o comprovante.
async function lerNoAparelho(
  arquivo: File,
  contexto: ContextoLancamento,
  progresso: (p: number) => void,
): Promise<Previa> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") progresso(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(arquivo);
    const lido = lerTextoComprovante(data.text, contexto.hoje);
    const sugestao = sugerirCategoria(
      `${lido.estabelecimento ?? ""} ${data.text.slice(0, 240)}`,
      lido.tipo,
      contexto,
    );
    return {
      ...lido,
      categoriaId: sugestao.categoriaId,
      categoriaAprendida: sugestao.aprendida,
      viaIA: false,
    };
  } finally {
    await worker.terminate();
  }
}

function LerFoto({
  ia,
  contexto,
  aoLer,
}: {
  ia: boolean;
  contexto: ContextoLancamento;
  aoLer: (p: Previa) => void;
}) {
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => void (miniatura && URL.revokeObjectURL(miniatura)),
    [miniatura],
  );

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setMiniatura(
      arquivo.type.startsWith("image/") ? URL.createObjectURL(arquivo) : null,
    );
    setLendo(true);
    setProgresso(null);
    const reduzido = await reduzir(arquivo);
    if (ia) {
      const form = new FormData();
      form.append("arquivo", reduzido);
      const r = await fetch("/api/financas/ler", {
        method: "POST",
        body: form,
      }).catch(() => null);
      const corpo = await r?.json().catch(() => null);
      if (r?.ok) {
        setLendo(false);
        return aoLer(corpo as Previa);
      }
      if (!arquivo.type.startsWith("image/")) {
        setLendo(false);
        return setErro(
          corpo?.erro ?? "Não conseguimos ler esse arquivo. Tente uma foto.",
        );
      }
    }
    if (!arquivo.type.startsWith("image/")) {
      setLendo(false);
      return setErro(
        "Sem a IA, só fotos (JPG, PNG) podem ser lidas. Tire uma foto do comprovante.",
      );
    }
    try {
      const previa = await lerNoAparelho(reduzido, contexto, setProgresso);
      setLendo(false);
      aoLer(previa);
    } catch {
      setLendo(false);
      setErro(
        "Não conseguimos ler essa foto. Verifique a conexão e tente de novo, com o comprovante reto e bem iluminado.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void enviar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept={
          ia ? "image/png,image/jpeg,image/webp,application/pdf" : "image/*"
        }
        className="hidden"
        onChange={(e) => {
          void enviar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-linha bg-superficie-2/60">
        {miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={miniatura}
            alt="Comprovante enviado"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-suave">
            <Camera className="h-8 w-8" aria-hidden="true" />
            Fotografe a nota, o cupom, o comprovante de Pix ou a fatura. Valor,
            data e local são lidos sozinhos.
          </div>
        )}
        {lendo ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-superficie/85 px-6 text-center text-sm font-medium text-texto backdrop-blur-sm">
            <Loader2
              className="h-6 w-6 animate-spin text-ciano"
              aria-hidden="true"
            />
            {progresso === null
              ? "Preparando a leitura…"
              : `Lendo o comprovante… ${Math.round(progresso * 100)}%`}
            {progresso !== null ? (
              <span className="h-1.5 w-40 overflow-hidden rounded-full bg-superficie-2">
                <span
                  className="block h-full rounded-full bg-ciano transition-all"
                  style={{ width: `${Math.round(progresso * 100)}%` }}
                />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {erro ? (
        <p
          role="alert"
          className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={lendo}
          onClick={() => camera.current?.click()}
          className="gradiente-marca flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-60"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Tirar foto
        </button>
        <button
          type="button"
          disabled={lendo}
          onClick={() => galeria.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-linha text-sm font-semibold text-texto hover:bg-superficie-2 disabled:opacity-60"
        >
          <ImageUp className="h-5 w-5" aria-hidden="true" />
          Da galeria
        </button>
      </div>
      <p className="text-center text-xs text-suave">
        {ia
          ? "A foto é lida e descartada; não guardamos a imagem."
          : "A leitura acontece no seu aparelho: a foto não sai dele. Na primeira vez leva alguns segundos a mais."}
      </p>
    </div>
  );
}

// Reduz fotos grandes no navegador antes do envio (lado maior até 1600 px, JPEG).
async function reduzir(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.size < 900_000)
    return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, "image/jpeg", 0.85),
    );
    return blob
      ? new File([blob], "comprovante.jpg", { type: "image/jpeg" })
      : arquivo;
  } catch {
    return arquivo;
  }
}

const EXEMPLOS = [
  "Gastei 85 reais no almoço hoje no débito",
  "Recebi 5 mil de salário",
  "Paguei 2.100 de aluguel no pix",
  "Comprei um tênis de 600 em 3x no crédito",
];

function Falar({ aoLer }: { aoLer: (p: Previa) => void }) {
  const [suportado, setSuportado] = useState(true);
  const [ouvindo, setOuvindo] = useState(false);
  const [frase, setFrase] = useState("");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const fraseAtual = useRef("");

  const interpretar = useCallback(
    async (texto: string) => {
      if (texto.trim().length < 2) return;
      setErro(null);
      setLendo(true);
      const r = await fetch("/api/financas/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frase: texto }),
      }).catch(() => null);
      setLendo(false);
      const corpo = await r?.json().catch(() => null);
      if (!r?.ok)
        return setErro(corpo?.erro ?? "Não entendi. Tente de novo ou digite.");
      if (!corpo.valor)
        return setErro(
          "Não encontrei o valor. Diga, por exemplo: “gastei 40 reais no Uber”.",
        );
      aoLer(corpo as Previa);
    },
    [aoLer],
  );

  const iniciar = useCallback(() => {
    const rec = criarReconhecimento();
    if (!rec) return setSuportado(false);
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    fraseAtual.current = "";
    rec.onresult = (e) => {
      const texto = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      fraseAtual.current = texto;
      setFrase(texto);
    };
    rec.onerror = (e) => {
      setOuvindo(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setErro(
          "Permita o uso do microfone no navegador, ou digite a frase abaixo.",
        );
      else if (e.error !== "no-speech" && e.error !== "aborted")
        setErro("Não consegui ouvir. Tente de novo ou digite.");
    };
    rec.onend = () => {
      setOuvindo(false);
      if (fraseAtual.current) void interpretar(fraseAtual.current);
    };
    reconhecimento.current = rec;
    setErro(null);
    setFrase("");
    setOuvindo(true);
    try {
      rec.start();
    } catch {
      setOuvindo(false);
    }
  }, [interpretar]);

  useEffect(() => {
    if (!criarReconhecimento()) setSuportado(false);
    return () => reconhecimento.current?.stop();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 pt-2 text-center">
        <button
          type="button"
          onClick={() => (ouvindo ? reconhecimento.current?.stop() : iniciar())}
          disabled={!suportado || lendo}
          aria-label={ouvindo ? "Parar de ouvir" : "Começar a falar"}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition disabled:opacity-40 ${ouvindo ? "bg-erro" : "gradiente-marca"}`}
        >
          {ouvindo ? (
            <span
              className="absolute inset-0 animate-ping rounded-full bg-erro/40"
              aria-hidden="true"
            />
          ) : null}
          {lendo ? (
            <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
          ) : ouvindo ? (
            <Square
              className="relative h-8 w-8"
              fill="currentColor"
              aria-hidden="true"
            />
          ) : (
            <Mic className="h-10 w-10" aria-hidden="true" />
          )}
        </button>
        <p className="text-sm text-suave">
          {!suportado
            ? "Este navegador não oferece ditado. Digite a frase abaixo."
            : lendo
              ? "Entendendo…"
              : ouvindo
                ? "Ouvindo… fale valor, o que foi e como pagou."
                : "Toque e fale como falaria com alguém."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void interpretar(frase);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="fin-frase" className="text-xs font-semibold text-suave">
          {ouvindo ? "Transcrição" : "Ou digite a frase"}
        </label>
        <div className="flex gap-2">
          <input
            id="fin-frase"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            maxLength={500}
            placeholder="Gastei 85 reais no almoço hoje no débito"
            className="h-12 min-w-0 flex-1 rounded-xl border border-linha bg-superficie-2 px-3.5 text-[15px] text-texto outline-none placeholder:text-suave/70 focus:border-ciano"
          />
          <button
            type="submit"
            disabled={lendo || frase.trim().length < 2}
            className="h-12 shrink-0 rounded-xl bg-superficie-2 px-4 text-sm font-semibold text-texto disabled:opacity-50"
          >
            Ler
          </button>
        </div>
      </form>

      {erro ? (
        <p
          role="alert"
          className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold text-suave">
          Experimente dizer
        </p>
        <ul className="flex flex-col gap-1.5">
          {EXEMPLOS.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => void interpretar(e)}
                className="w-full rounded-xl border border-linha px-3.5 py-2.5 text-left text-sm text-texto hover:bg-superficie-2"
              >
                “{e}”
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
