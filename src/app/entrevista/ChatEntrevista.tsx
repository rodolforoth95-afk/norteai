"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, Coins, SendHorizontal, Sparkles } from "lucide-react";
import { Estrela } from "@/components/Logo";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Botao } from "@/components/Botao";
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  interpretarResposta,
  proximaPergunta,
  verificarTextoLivre,
} from "@/lib/dominio/entrevista";
import { INFO_ESTILO } from "@/lib/dominio/catalogo";
import type { EstadoEntrevista, Perfil } from "@/lib/dominio/tipos";
import { concluirEntrevista, reiniciarEntrevista, responderPergunta } from "@/app/acoes";
import { postarJson } from "@/lib/email-pendente";

type Nota = { depoisDe: number; texto: string; usuario: string; ia?: boolean };

export function ChatEntrevista({
  primeiroNome,
  inicial,
  refazer,
  iaAtiva,
}: {
  primeiroNome: string;
  inicial: EstadoEntrevista;
  refazer: boolean;
  iaAtiva: boolean;
}) {
  const router = useRouter();
  const vazio: EstadoEntrevista = { respostas: {}, concluida: false, atualizada_em: "" };
  const [estado, setEstado] = useState(refazer ? vazio : inicial);
  const [comecou, setComecou] = useState(!refazer && Object.keys(inicial.respostas).length > 0);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [texto, setTexto] = useState("");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [moedas, setMoedas] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pensando, setPensando] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);

  const atual = proximaPergunta(estado.respostas);
  const pergunta = PERGUNTAS[atual];
  const retomando = Object.keys(inicial.respostas).length > 0 && !inicial.concluida && !refazer;

  // "Refazer entrevista": limpa as respostas antes de começar.
  useEffect(() => {
    if (!refazer) return;
    iniciar(async () => {
      await reiniciarEntrevista();
      router.replace("/entrevista");
    });
  }, [refazer, router]);

  // Terminou as 9 perguntas: o servidor calcula o estilo.
  useEffect(() => {
    if (atual < TOTAL_PERGUNTAS || perfil || !comecou) return;
    iniciar(async () => {
      const r = await concluirEntrevista();
      if ("erro" in r && r.erro) return setErro(r.erro);
      if ("perfil" in r && r.perfil) {
        setPerfil(r.perfil);
        setMoedas(r.moedas ?? 0);
      }
    });
  }, [atual, perfil, comecou]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [estado, notas, perfil, comecou]);

  function responder(valor: string) {
    if (!pergunta) return;
    setErro(null);
    const campo = pergunta.campo;
    setEstado((e) => ({ ...e, respostas: { ...e.respostas, [campo]: valor } }));
    iniciar(async () => {
      const r = await responderPergunta(campo, valor);
      if ("erro" in r && r.erro) {
        setErro(r.erro);
        setEstado((e) => {
          const respostas = { ...e.respostas };
          delete respostas[campo];
          return { ...e, respostas };
        });
      }
    });
  }

  async function enviarTexto(e: FormEvent) {
    e.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || !pergunta || pensando) return;
    setTexto("");
    const indice = atual;

    // Com a IA ligada, o Claude interpreta a mensagem e pode registrar respostas.
    // Dado sensível nunca sai do aparelho; se a IA falhar, cai na interpretação local abaixo.
    if (iaAtiva && verificarTextoLivre(mensagem) !== "dado_sensivel") {
      setPensando(mensagem);
      const historico = notas.filter((n) => n.ia).slice(-6).map((n) => ({ usuario: n.usuario, ia: n.texto }));
      const r = await postarJson<{ resposta?: string; estado?: EstadoEntrevista }>("/api/entrevista/mensagem", { mensagem, historico });
      setPensando(null);
      if (r.ok && r.dados.resposta && r.dados.estado) {
        setNotas((n) => [...n, { depoisDe: indice, usuario: mensagem, texto: r.dados.resposta!, ia: true }]);
        setEstado(r.dados.estado);
        return;
      }
    }

    const alerta = verificarTextoLivre(mensagem);
    if (alerta === "dado_sensivel") {
      return setNotas((n) => [
        ...n,
        {
          depoisDe: atual,
          usuario: "[informação removida]",
          texto: "Não preciso dessa informação, e ela não foi guardada. Vamos seguir com a pergunta?",
        },
      ]);
    }
    if (alerta === "pedido_de_ativo") {
      return setNotas((n) => [
        ...n,
        {
          depoisDe: atual,
          usuario: mensagem,
          texto:
            "Aqui eu não indico investimentos específicos, mas posso te explicar como cada tipo funciona. Depois da entrevista, a aba Aprender tem conteúdos sobre isso. Voltando à pergunta:",
        },
      ]);
    }

    const valor = interpretarResposta(pergunta.campo, mensagem);
    if (valor) return responder(valor);
    setNotas((n) => [
      ...n,
      { depoisDe: atual, usuario: mensagem, texto: `Não tenho certeza se entendi "${mensagem}". Qual destas opções chega mais perto?` },
    ]);
  }

  const progresso = Math.min(atual, TOTAL_PERGUNTAS) / TOTAL_PERGUNTAS;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-2xl">
      <header className="vidro sticky top-0 z-10 border-b border-linha px-5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <Link href="/inicio" aria-label="Sair da entrevista" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-suave hover:text-texto">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="font-display text-base font-semibold text-texto">Entrevista rápida</h1>
          <span className="w-11 text-right text-xs text-suave">
            {Math.min(atual + (perfil ? 0 : 1), TOTAL_PERGUNTAS)}/{TOTAL_PERGUNTAS}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL_PERGUNTAS} aria-valuenow={Math.min(atual, TOTAL_PERGUNTAS)} aria-label="Progresso da entrevista">
          <div className="gradiente-marca h-full rounded-full transition-all duration-500" style={{ width: `${progresso * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-suave">
          {atual < TOTAL_PERGUNTAS ? `Pergunta ${atual + 1} de ${TOTAL_PERGUNTAS}` : "Entrevista concluída"}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 py-6" aria-live="polite">
        <BalaoIA>
          {retomando ? (
            <>Que bom te ver de volta{primeiroNome ? `, ${primeiroNome}` : ""}! Vamos continuar de onde paramos.</>
          ) : (
            <>
              <p>
                Oi{primeiroNome ? `, ${primeiroNome}` : ""}! Vou te fazer 9 perguntas rápidas, leva uns 4 minutos. No fim,
                você já recebe um primeiro diagnóstico do seu dinheiro.
              </p>
              <p className="mt-2">
                Não vou pedir CPF nem senha de banco. E um combinado: aqui eu explico, comparo e simulo, mas não indico
                investimentos específicos. A decisão é sempre sua.
              </p>
            </>
          )}
        </BalaoIA>

        {!comecou ? (
          <div className="animate-subir">
            <Botao onClick={() => setComecou(true)} disabled={pendente}>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Bora começar
            </Botao>
          </div>
        ) : (
          <>
            {PERGUNTAS.slice(0, atual).map((p, i) => (
              <div key={p.campo} className="flex flex-col gap-3">
                <BalaoIA>{p.texto}</BalaoIA>
                {notas
                  .filter((n) => n.depoisDe === i)
                  .map((n, j) => (
                    <NotaChat key={j} nota={n} />
                  ))}
                <BalaoUsuario>{estado.respostas[p.campo]}</BalaoUsuario>
                {p.campo === "tem_divida_cara" && estado.respostas[p.campo] === "Sim" ? (
                  <BalaoIA>Obrigado por contar. Isso é muito comum e tem saída. O seu plano vai tratar disso primeiro.</BalaoIA>
                ) : null}
              </div>
            ))}

            {pergunta ? (
              <div className="flex flex-col gap-3">
                <BalaoIA>{pergunta.texto}</BalaoIA>
                {notas
                  .filter((n) => n.depoisDe === atual)
                  .map((n, i) => (
                    <NotaChat key={i} nota={n} />
                  ))}
                {pensando ? (
                  <>
                    <BalaoUsuario>{pensando}</BalaoUsuario>
                    <BalaoIA>
                      <span className="inline-flex gap-1" aria-label="O guia está escrevendo">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-suave" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </span>
                    </BalaoIA>
                  </>
                ) : null}
                <div className="flex flex-col gap-2 animate-subir" role="group" aria-label="Opções de resposta">
                  {pergunta.opcoes.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => responder(o)}
                      disabled={pendente}
                      className="min-h-12 rounded-2xl border border-linha bg-superficie/70 px-4 py-2 text-left text-sm font-medium text-texto transition hover:border-violeta hover:bg-superficie-2 disabled:opacity-60"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {atual >= TOTAL_PERGUNTAS && !perfil ? <BalaoIA>Calculando seu diagnóstico…</BalaoIA> : null}

            {perfil ? <Encerramento perfil={perfil} moedas={moedas} aoVer={() => router.push("/perfil")} /> : null}
          </>
        )}

        {erro ? <p className="text-sm text-erro" role="alert">{erro}</p> : null}
        <div ref={fim} />
      </div>

      {comecou && pergunta ? (
        <form onSubmit={enviarTexto} className="vidro sticky bottom-0 flex gap-2 border-t border-linha px-5 py-3">
          <label htmlFor="resposta-livre" className="sr-only">
            Responder com suas palavras
          </label>
          <input
            id="resposta-livre"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={iaAtiva ? "Ou converse com o guia…" : "Ou responda com suas palavras…"}
            autoComplete="off"
            className="min-h-12 flex-1 rounded-2xl border border-linha bg-superficie px-4 text-sm text-texto placeholder:text-suave/70 focus:border-violeta focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar resposta"
            disabled={!texto.trim() || pendente || Boolean(pensando)}
            className="gradiente-marca flex h-12 w-12 items-center justify-center rounded-2xl text-black disabled:opacity-50"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      ) : null}
    </main>
  );
}

function Encerramento({ perfil, moedas, aoVer }: { perfil: Perfil; moedas: number; aoVer: () => void }) {
  const r = perfil.respostas;
  const info = INFO_ESTILO[perfil.estilo];
  return (
    <div className="flex flex-col gap-3">
      <BalaoIA>
        <p>
          Pronto! Resumo do que entendi: seu objetivo principal é <strong>{minuscula(r.objetivo_principal)}</strong> em{" "}
          <strong>{minuscula(r.horizonte)}</strong>, sobra cerca de <strong>{minuscula(r.sobra_mensal_faixa)}</strong> por
          mês e você tem <strong>{minuscula(r.reserva_meses)}</strong> de reserva.
        </p>
      </BalaoIA>
      <div className="borda-gradiente relative animate-subir overflow-hidden rounded-3xl p-5">
        <div className="gradiente-marca pointer-events-none absolute -right-10 -top-10 h-32 w-32 animate-brilho rounded-full opacity-40 blur-2xl" aria-hidden="true" />
        <p className="text-sm text-suave">Seu estilo de investidor (educacional)</p>
        <p className="texto-gradiente mt-1 font-display text-3xl font-bold">{perfil.estilo}</p>
        <p className="mt-1 text-sm font-medium" style={{ color: info.cor }}>
          {info.risco}
        </p>
        <p className="mt-3 text-sm text-suave">Você pode ajustar qualquer resposta na próxima tela.</p>
        {moedas > 0 ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-ambar/40 bg-ambar/10 px-3 py-1 text-sm font-medium text-ambar">
            <Coins className="h-4 w-4" aria-hidden="true" />+{moedas} coins
          </p>
        ) : null}
      </div>
      <Botao larguraTotal onClick={aoVer}>
        Ver meu diagnóstico
      </Botao>
      <AvisoEducacional />
    </div>
  );
}

// "Mais de 5 anos" → "mais de 5 anos", sem estragar "R$".
function minuscula(t: string) {
  return t.startsWith("R$") ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

function NotaChat({ nota }: { nota: Nota }) {
  return (
    <>
      <BalaoUsuario>{nota.usuario}</BalaoUsuario>
      <BalaoIA>{nota.texto}</BalaoIA>
    </>
  );
}

function BalaoIA({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-subir items-end gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-linha bg-superficie">
        <Estrela className="h-4 w-4" />
      </span>
      <div className="max-w-[85%] rounded-3xl rounded-bl-md border border-linha bg-superficie/90 px-4 py-3 text-sm leading-relaxed text-texto">
        {children}
      </div>
    </div>
  );
}

function BalaoUsuario({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-subir justify-end">
      <div className="gradiente-marca max-w-[85%] rounded-3xl rounded-br-md px-4 py-3 text-sm font-medium text-black">
        {children}
      </div>
    </div>
  );
}
