"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TelaAuth } from "@/components/TelaAuth";
import { Alerta, CaixaSelecao, Campo, CampoSenha } from "@/components/Campo";
import { Botao } from "@/components/Botao";
import { REGRA_SENHA, erroDe, esquemaEmail, esquemaNome, esquemaSenha } from "@/lib/validacao";
import { guardarEmailPendente, postarJson } from "@/lib/email-pendente";

type Campos = "nome" | "email" | "senha";

// Tela 2 — Cadastro
export default function PaginaCadastro() {
  const router = useRouter();
  const [valores, setValores] = useState({ nome: "", email: "", senha: "" });
  const [tocados, setTocados] = useState<Record<Campos, boolean>>({
    nome: false,
    email: false,
    senha: false,
  });
  const [maioridade, setMaioridade] = useState(false);
  const [termos, setTermos] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const erros: Record<Campos, string | null> = {
    nome: erroDe(esquemaNome, valores.nome),
    email: erroDe(esquemaEmail, valores.email),
    senha: erroDe(esquemaSenha, valores.senha),
  };
  const valido = !erros.nome && !erros.email && !erros.senha && maioridade && termos;

  function alterar(campo: Campos, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }
  function tocar(campo: Campos) {
    setTocados((t) => ({ ...t, [campo]: true }));
  }

  async function criarConta(e: FormEvent) {
    e.preventDefault();
    setTocados({ nome: true, email: true, senha: true });
    if (!valido) return;
    setErroGeral(null);
    setEnviando(true);
    const { ok, dados } = await postarJson<{ destino?: string; verificar?: boolean }>("/api/auth/cadastro", {
      ...valores,
      maioridade,
      termos,
    });
    setEnviando(false);
    if (!ok) {
      setErroGeral(dados.erro ?? "Não foi possível criar a conta.");
      return;
    }
    if (dados.destino) {
      // Conta já confirmada (sem código por e-mail): entra direto no app.
      window.location.assign(dados.destino);
      return;
    }
    guardarEmailPendente(valores.email.trim().toLowerCase());
    router.push("/verificar");
  }

  const senhaOk = valores.senha.length > 0 && !erros.senha;

  return (
    <TelaAuth
      titulo="Crie sua conta"
      subtitulo="Leva 1 minuto. Não pedimos CPF nem dados bancários."
      rodape={
        <p className="text-center text-sm text-suave">
          Já tem conta?{" "}
          <Link href="/" className="font-bold text-texto underline underline-offset-4">
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={criarConta} className="flex flex-col gap-5" noValidate>
        {erroGeral ? <Alerta>{erroGeral}</Alerta> : null}
        <Campo
          rotulo="Nome completo"
          autoComplete="name"
          value={valores.nome}
          onChange={(e) => alterar("nome", e.target.value)}
          onBlur={() => tocar("nome")}
          erro={tocados.nome ? erros.nome : null}
        />
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={valores.email}
          onChange={(e) => alterar("email", e.target.value)}
          onBlur={() => tocar("email")}
          erro={tocados.email ? erros.email : null}
        />
        <CampoSenha
          rotulo="Senha"
          autoComplete="new-password"
          value={valores.senha}
          onChange={(e) => alterar("senha", e.target.value)}
          onBlur={() => tocar("senha")}
          ajuda={senhaOk ? "Senha dentro da regra." : REGRA_SENHA}
          erro={tocados.senha && valores.senha ? erros.senha : null}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Confirmações obrigatórias</legend>
          <CaixaSelecao marcado={maioridade} aoMudar={setMaioridade}>
            Tenho 18 anos ou mais
          </CaixaSelecao>
          <CaixaSelecao marcado={termos} aoMudar={setTermos}>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-bold underline underline-offset-4">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold underline underline-offset-4">
              Política de privacidade
            </Link>
          </CaixaSelecao>
        </fieldset>

        <Botao type="submit" larguraTotal carregando={enviando} disabled={!valido}>
          Criar conta
        </Botao>
      </form>
    </TelaAuth>
  );
}
