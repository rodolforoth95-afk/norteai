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
      titulo="Seu dinheiro com direção."
      subtitulo="Um guia com IA que explica, compara e simula. Sem vender nenhum produto."
      rodape={
        <p className="text-center text-sm text-suave">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-bold text-texto underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      }
    >
      <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
        {erro ? <Alerta>{erro}</Alerta> : null}
        <Campo
          rotulo="E-mail"
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
        <Botao type="submit" larguraTotal carregando={enviando} disabled={!email || !senha}>
          Entrar
        </Botao>
        <Link
          href="/esqueci-senha"
          className="mx-auto inline-flex min-h-11 items-center text-sm font-medium text-texto underline underline-offset-4"
        >
          Esqueci minha senha
        </Link>
      </form>
    </TelaAuth>
  );
}
