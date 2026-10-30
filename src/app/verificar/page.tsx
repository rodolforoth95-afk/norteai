"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { TelaAuth } from "@/components/TelaAuth";
import { Alerta } from "@/components/Campo";
import { Botao } from "@/components/Botao";
import { lerEmailPendente, limparEmailPendente, postarJson } from "@/lib/email-pendente";

const DIGITOS = 6;
const ESPERA_REENVIO = 60;

// Tela 3 — Verificação de e-mail
export default function PaginaVerificar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [digitos, setDigitos] = useState<string[]>(Array(DIGITOS).fill(""));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [precisaNovoCodigo, setPrecisaNovoCodigo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(ESPERA_REENVIO);
  const campos = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const pendente = lerEmailPendente();
    if (!pendente) router.replace("/cadastro");
    else setEmail(pendente);
  }, [router]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const codigo = digitos.join("");

  function preencher(inicio: number, texto: string) {
    const novos = [...digitos];
    const limpos = texto.replace(/\D/g, "").slice(0, DIGITOS - inicio).split("");
    limpos.forEach((d, i) => (novos[inicio + i] = d));
    setDigitos(novos);
    const proximo = Math.min(inicio + limpos.length, DIGITOS - 1);
    campos.current[proximo]?.focus();
  }

  function aoDigitar(i: number, valor: string) {
    if (valor === "") {
      const novos = [...digitos];
      novos[i] = "";
      setDigitos(novos);
      return;
    }
    preencher(i, valor);
  }

  function aoTeclar(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digitos[i] && i > 0) campos.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) campos.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < DIGITOS - 1) campos.current[i + 1]?.focus();
  }

  function aoColar(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    preencher(i, e.clipboardData.getData("text"));
  }

  async function confirmar() {
    if (!email || codigo.length !== DIGITOS) return;
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const { ok, dados } = await postarJson<{ destino?: string; novoCodigo?: boolean }>(
      "/api/auth/verificar",
      { email, codigo },
    );
    setEnviando(false);
    if (!ok) {
      setErro(dados.erro ?? "Não foi possível confirmar.");
      if (dados.novoCodigo) setPrecisaNovoCodigo(true);
      setDigitos(Array(DIGITOS).fill(""));
      campos.current[0]?.focus();
      return;
    }
    limparEmailPendente();
    // Navegação completa: garante que o novo cookie de sessão vale em todas as rotas.
    window.location.assign(dados.destino ?? "/entrevista");
  }

  async function reenviar() {
    if (!email || espera > 0) return;
    setErro(null);
    setAviso(null);
    const { ok, dados } = await postarJson<{ espera?: number }>("/api/auth/reenviar", { email });
    if (!ok) {
      setErro(dados.erro ?? "Não foi possível reenviar.");
      if (dados.espera) setEspera(dados.espera);
      return;
    }
    setPrecisaNovoCodigo(false);
    setDigitos(Array(DIGITOS).fill(""));
    setEspera(ESPERA_REENVIO);
    setAviso("Enviamos um novo código. Ele vale por 10 minutos.");
    campos.current[0]?.focus();
  }

  return (
    <TelaAuth
      titulo="Confirme seu e-mail"
      subtitulo={
        <>
          Enviamos um código de 6 dígitos para{" "}
          <strong className="break-all text-texto">{email ?? "seu e-mail"}</strong>.
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {erro ? <Alerta>{erro}</Alerta> : null}
        {aviso ? <Alerta tipo="info">{aviso}</Alerta> : null}

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-texto">Código de verificação</legend>
          <div className="flex justify-between gap-2">
            {digitos.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  campos.current[i] = el;
                }}
                value={d}
                onChange={(e) => aoDigitar(i, e.target.value)}
                onKeyDown={(e) => aoTeclar(i, e)}
                onPaste={(e) => aoColar(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={DIGITOS}
                aria-label={`Dígito ${i + 1} de ${DIGITOS}`}
                disabled={precisaNovoCodigo}
                className="h-14 w-full min-w-0 max-w-14 rounded-xl border border-linha bg-white text-center font-display text-2xl font-semibold text-texto focus:outline-none focus:ring-2 focus:ring-ambar disabled:bg-superficie"
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-suave">O código vale por 10 minutos.</p>
        </fieldset>

        <Botao
          larguraTotal
          onClick={confirmar}
          carregando={enviando}
          disabled={codigo.length !== DIGITOS || precisaNovoCodigo}
        >
          Confirmar
        </Botao>

        <div className="flex flex-col items-center gap-1 text-sm">
          {espera > 0 ? (
            <p className="flex min-h-11 items-center text-suave" aria-live="polite">
              Reenviar código em {espera} s
            </p>
          ) : (
            <Botao variante="texto" onClick={reenviar}>
              Reenviar código
            </Botao>
          )}
          <Link
            href="/cadastro"
            onClick={limparEmailPendente}
            className="inline-flex min-h-11 items-center font-medium text-texto underline underline-offset-4"
          >
            Trocar e-mail
          </Link>
        </div>
      </div>
    </TelaAuth>
  );
}
