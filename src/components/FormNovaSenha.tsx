"use client";

import { useState, type FormEvent } from "react";
import { Alerta, CampoSenha } from "./Campo";
import { Botao } from "./Botao";
import { REGRA_SENHA, erroDe, esquemaSenha } from "@/lib/validacao";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

// Usado na redefinição de senha (link do e-mail) e em "Trocar senha" na Conta.
export function FormNovaSenha({ aoConcluir }: { aoConcluir?: () => void }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const erroSenha = senha ? erroDe(esquemaSenha, senha) : null;
  const erroConfirmacao =
    confirmacao && confirmacao !== senha ? "As senhas não são iguais." : null;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (erroDe(esquemaSenha, senha) || senha !== confirmacao) return;
    setErro(null);
    setEnviando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro(
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível trocar a senha. Tente de novo.",
      );
      return;
    }
    setSucesso(true);
    setSenha("");
    setConfirmacao("");
    aoConcluir?.();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5" noValidate>
      {erro ? <Alerta>{erro}</Alerta> : null}
      {sucesso ? <Alerta tipo="info">Senha alterada.</Alerta> : null}
      <CampoSenha
        rotulo="Nova senha"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        ajuda={REGRA_SENHA}
        erro={erroSenha}
      />
      <CampoSenha
        rotulo="Repita a nova senha"
        autoComplete="new-password"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        erro={erroConfirmacao}
      />
      <Botao
        type="submit"
        larguraTotal
        carregando={enviando}
        disabled={!senha || !!erroSenha || senha !== confirmacao}
      >
        Salvar nova senha
      </Botao>
    </form>
  );
}
