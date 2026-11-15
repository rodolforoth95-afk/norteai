"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Camera,
  CandlestickChart,
  Check,
  Copy,
  GraduationCap,
  MessageCircle,
  Mic,
  ReceiptText,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  desligarWhatsApp,
  gerarCodigoWhatsApp,
  salvarTelefoneWhatsApp,
  whatsAppVinculado,
} from "@/app/acoes-whatsapp";

type Props = {
  vinculo: { telefone: string; desde: string; confirmado: boolean } | null;
  numeroFindomo: string | null;
};

const RECURSOS = [
  {
    Icone: ReceiptText,
    titulo: "Lançar por texto",
    texto: '"gastei 85 no almoço no débito"',
  },
  {
    Icone: Camera,
    titulo: "Foto da nota",
    texto: "cupom, comprovante de Pix ou fatura",
  },
  {
    Icone: Mic,
    titulo: "Áudio",
    texto: "fale o lançamento como falaria para alguém",
  },
  {
    Icone: Target,
    titulo: "Mês e plano",
    texto: '"resumo" ou "como está meu plano?"',
  },
  {
    Icone: CandlestickChart,
    titulo: "Carteira e bolsa",
    texto: '"cotação PETR4", "como está a Selic?"',
  },
  {
    Icone: GraduationCap,
    titulo: "Aprender",
    texto: '"o que é CDB?" com link da aula',
  },
];

const EXEMPLOS = [
  "recebi 3.200 de salário",
  "paguei 120 de luz no pix",
  "quanto gastei com mercado?",
  "como está meu plano?",
  "minha carteira",
  "apagar o último",
];

function linkWhatsApp(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function ConectarWhatsApp({ vinculo, numeroFindomo }: Props) {
  const router = useRouter();
  const [consentiu, setConsentiu] = useState(false);
  const [codigo, setCodigo] = useState<{
    codigo: string;
    expiraEm: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [restante, setRestante] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [comCodigo, setComCodigo] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    const fim = Date.parse(codigo.expiraEm);
    const relogio = setInterval(
      () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000))),
      1000,
    );
    const conferir = setInterval(async () => {
      if (await whatsAppVinculado().catch(() => false)) {
        setCodigo(null);
        router.refresh();
      }
    }, 4000);
    setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    return () => {
      clearInterval(relogio);
      clearInterval(conferir);
    };
  }, [codigo, router]);

  async function gerar() {
    setErro(null);
    setProcessando(true);
    const r = await gerarCodigoWhatsApp(consentiu);
    setProcessando(false);
    if ("erro" in r)
      return setErro(r.erro ?? "Não foi possível gerar o código.");
    setCodigo(r);
  }

  async function salvarTelefone() {
    setErro(null);
    setProcessando(true);
    const r = await salvarTelefoneWhatsApp(telefone, consentiu);
    setProcessando(false);
    if ("erro" in r) return setErro(r.erro ?? "Não foi possível salvar.");
    router.refresh();
  }

  async function desligar() {
    setProcessando(true);
    const r = await desligarWhatsApp();
    setProcessando(false);
    setConfirmandoSaida(false);
    if ("erro" in r) return setErro(r.erro ?? "Não foi possível desligar.");
    router.refresh();
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  if (vinculo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="painel flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-menta/15 text-menta">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-texto">
                {vinculo.confirmado
                  ? "WhatsApp conectado"
                  : "Celular cadastrado"}
              </p>
              <p className="text-sm text-suave">
                {vinculo.telefone} · desde{" "}
                {new Date(vinculo.desde).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!vinculo.confirmado ? (
              <p className="w-full text-sm text-texto">
                Agora mande um &quot;oi&quot; do seu WhatsApp para o número do
                Findomo. O Mordomo reconhece o seu número e já começa a
                atender.
              </p>
            ) : null}
            {numeroFindomo ? (
              <a
                href={linkWhatsApp(numeroFindomo, vinculo.confirmado ? "ajuda" : "oi")}
                target="_blank"
                rel="noreferrer"
                className="gradiente-marca flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Abrir
                conversa
              </a>
            ) : null}
            {confirmandoSaida ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-texto">
                  Desligar este WhatsApp?
                </span>
                <button
                  type="button"
                  onClick={desligar}
                  disabled={processando}
                  className="flex h-10 items-center rounded-full bg-gravata px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                >
                  Desligar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoSaida(false)}
                  className="flex h-10 items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="flex h-10 items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
              >
                Desligar WhatsApp
              </button>
            )}
          </div>
          {erro ? <p className="text-sm text-gravata">{erro}</p> : null}
        </div>

        <div className="painel flex flex-col gap-3 p-5">
          <p className="font-display text-base font-semibold text-texto">
            Experimente mandar
          </p>
          <ul className="flex flex-wrap gap-2">
            {EXEMPLOS.map((e) => (
              <li
                key={e}
                className="rounded-full bg-superficie-2 px-3 py-1.5 text-sm text-texto"
              >
                {e}
              </li>
            ))}
          </ul>
          <p className="text-xs text-suave">
            Antes de gravar qualquer lançamento, o Mordomo mostra o que entendeu
            e pede um &quot;sim&quot;. Para desligar pelo próprio WhatsApp,
            mande SAIR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="painel flex flex-col gap-4 p-5">
        <p className="font-display text-base font-semibold text-texto">
          O que dá para fazer
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RECURSOS.map(({ Icone, titulo, texto }) => (
            <li
              key={titulo}
              className="flex items-start gap-3 rounded-xl bg-superficie-2/60 p-3"
            >
              <Icone
                className="mt-0.5 h-5 w-5 shrink-0 text-ciano"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-texto">
                  {titulo}
                </span>
                <span className="block text-xs text-suave">{texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="painel flex flex-col gap-4 p-5">
        {codigo ? (
          <>
            <p className="font-display text-base font-semibold text-texto">
              Envie este código para o WhatsApp do Findomo
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-2xl bg-superficie-2 px-5 py-3 font-display text-3xl font-bold tracking-[0.2em] text-texto tabular-nums">
                {codigo.codigo.slice(0, 3)} {codigo.codigo.slice(3)}
              </span>
              <button
                type="button"
                onClick={() => copiar(codigo.codigo)}
                className="flex h-10 items-center gap-1.5 rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
              >
                {copiado ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            {numeroFindomo ? (
              <a
                href={linkWhatsApp(numeroFindomo, `FINDOMO ${codigo.codigo}`)}
                target="_blank"
                rel="noreferrer"
                className="gradiente-marca flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Abrir o
                WhatsApp com o código
              </a>
            ) : (
              <p className="text-sm text-suave">
                O número do Findomo ainda não foi configurado. Assim que
                estiver, o botão para abrir o WhatsApp aparece aqui.
              </p>
            )}
            <p className="text-sm text-suave" aria-live="polite">
              {restante > 0
                ? `Vale por mais ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}. Esta tela atualiza sozinha quando o Mordomo responder.`
                : "O código venceu. Gere outro."}
            </p>
            {restante === 0 ? (
              <button
                type="button"
                onClick={gerar}
                disabled={processando}
                className="flex h-10 w-fit items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
              >
                Gerar novo código
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-display text-base font-semibold text-texto">
              Conectar o seu WhatsApp
            </p>
            <p className="text-sm text-suave">
              Informe o seu celular. Depois é só mandar um &quot;oi&quot; para o
              WhatsApp do Findomo: o Mordomo reconhece o seu número.
            </p>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-texto">
              Seu celular com DDD
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(11) 99999-8888"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="h-11 rounded-xl border border-linha bg-superficie px-3 text-base font-normal text-texto outline-none focus:border-ciano"
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-superficie-2/60 p-3 text-sm text-texto">
              <input
                id="consentimento-whatsapp"
                type="checkbox"
                checked={consentiu}
                onChange={(e) => setConsentiu(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ciano"
              />
              <span>
                Autorizo o Findomo a receber e responder minhas mensagens neste
                WhatsApp para registrar e consultar minhas finanças. As
                mensagens ficam guardadas por 90 dias e eu posso desligar a
                qualquer momento. Veja a{" "}
                <Link
                  href="/privacidade"
                  className="font-semibold text-ciano hover:underline"
                >
                  política de privacidade
                </Link>
                .
              </span>
            </label>
            <button
              type="button"
              onClick={salvarTelefone}
              disabled={!consentiu || processando || telefone.replace(/\D/g, "").length < 10}
              className="gradiente-marca flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Salvar
              meu celular
            </button>
            {comCodigo ? (
              <div className="flex flex-col gap-2 border-t border-linha pt-3">
                <p className="text-sm text-texto">
                  Use o código se o celular já estiver em outra conta: ele prova
                  que o número é seu e passa o WhatsApp para esta conta.
                </p>
                <button
                  type="button"
                  onClick={gerar}
                  disabled={!consentiu || processando}
                  className="flex h-10 w-fit items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2 disabled:opacity-50"
                >
                  Gerar código de 6 dígitos
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setComCodigo(true)}
                className="w-fit text-sm font-semibold text-ciano hover:underline"
              >
                Prefiro ligar com um código
              </button>
            )}
          </>
        )}
        {erro ? <p className="text-sm text-gravata">{erro}</p> : null}
        <p className="flex items-start gap-2 text-xs text-suave">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Só o WhatsApp do celular cadastrado aqui vê as suas finanças. Na
          primeira conversa, o Mordomo avisa de qual conta é o número. O
          Findomo é educacional e não indica investimentos.
        </p>
      </div>
    </div>
  );
}
