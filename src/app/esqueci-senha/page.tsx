"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { TelaAuth } from "@/components/TelaAuth";
import { Alerta, Campo } from "@/components/Campo";
import { Botao } from "@/components/Botao";
import { erroDe, esquemaEmail } from "@/lib/validacao";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

function Formulario() {
  const linkInvalido = useSearchParams().get("link") === "invalido";
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const invalido = erroDe(esquemaEmail, email);
    if (invalido) return setErro(invalido);
    setErro(null);
    setEnviando(true);
    const supabase = criarClienteNavegador();
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setEnviando(false);
    // Mesma mensagem com ou sem conta, para não revelar quais e-mails existem.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Alerta tipo="info">
        Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.
        Confira também a caixa de spam.
      </Alerta>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      {linkInvalido ? <Alerta>Esse link expirou ou já foi usado. Peça um novo.</Alerta> : null}
      <Campo
        rotulo="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erro}
      />
      <Botao type="submit" larguraTotal carregando={enviando} disabled={!email}>
        Enviar link
      </Botao>
    </form>
  );
}

export default function PaginaEsqueciSenha() {
  return (
    <TelaAuth
      titulo="Esqueci minha senha"
      subtitulo="Informe seu e-mail e enviaremos um link para você criar uma nova senha."
      rodape={
        <Link href="/" className="mx-auto inline-flex min-h-11 items-center text-sm font-medium text-texto underline underline-offset-4">
          Voltar para o login
        </Link>
      }
    >
      <Suspense>
        <Formulario />
      </Suspense>
    </TelaAuth>
  );
}
