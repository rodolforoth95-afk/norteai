"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TelaAuth } from "@/components/TelaAuth";
import { Alerta, Campo, CampoSenha } from "@/components/Campo";
import { Botao } from "@/components/Botao";
import { guardarEmailPendente, postarJson } from "@/lib/email-pendente";

// Tela 1 — Boas-vindas e login
export default function PaginaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Preencha o e-mail e a senha para entrar.");
      return;
    }
    setEnviando(true);
    const { ok, dados } = await postarJson<{ destino?: string; verificar?: boolean }>(
      "/api/auth/entrar",
      { email, senha },
    );
    setEnviando(false);

    if (dados.verificar) {
      guardarEmailPendente(email.trim().toLowerCase());
      router.push("/verificar");
      return;
    }
    if (!ok) {
      setErro(dados.erro ?? "Não foi possível entrar.");
      return;
    }
    // Navegação completa: garante que o novo cookie de sessão vale em todas as rotas.
    window.location.assign(dados.destino ?? "/inicio");
  }

  return (
    <TelaAuth
      titulo="Entrar"
      subtitulo="Sua carteira, as simulações e as aulas que você começou continuam onde você deixou."
      rodape={
        <p className="text-sm text-suave">
          Primeira vez aqui?{" "}
          <Link href="/cadastro" className="font-semibold text-ciano hover:underline">
            Criar conta
          </Link>{" "}
          · leva 1 minuto, sem CPF.
        </p>
      }
    >
      <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
        {erro ? <Alerta>{erro}</Alerta> : null}
        <Campo
          rotulo="E-mail"
          placeholder="voce@email.com"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <CampoSenha
          rotulo="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <div className="-mt-2 flex justify-end">
          <Link href="/esqueci-senha" className="inline-flex min-h-9 items-center text-sm font-medium text-ciano hover:underline">
            Esqueci a senha
          </Link>
        </div>
        <Botao type="submit" larguraTotal carregando={enviando}>
          Entrar
        </Botao>
      </form>
    </TelaAuth>
  );
}
