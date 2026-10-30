"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Download, FileText, KeyRound, LogOut, Shield, Trash2, UserRound } from "lucide-react";
import { Botao } from "@/components/Botao";
import { Alerta, Campo } from "@/components/Campo";
import { FormNovaSenha } from "@/components/FormNovaSenha";
import { postarJson } from "@/lib/email-pendente";

const ITEM =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left text-texto hover:bg-superficie-2";

export function AcoesConta({ teste = false }: { teste?: boolean }) {
  const router = useRouter();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  async function sair() {
    await postarJson("/api/auth/sair", {});
    window.location.assign("/");
  }

  async function excluirConta() {
    setErro(null);
    setProcessando(true);
    const { ok, dados } = await postarJson("/api/conta/excluir", { confirmacao });
    setProcessando(false);
    if (!ok) return setErro(dados.erro ?? "Não foi possível excluir a conta.");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {teste ? (
        <Alerta tipo="info">
          Você está no modo de teste. Trocar senha e excluir conta só funcionam com o Supabase
          configurado.
        </Alerta>
      ) : null}
      <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
        <li>
          <button
            type="button"
            className={ITEM}
            onClick={() => setTrocandoSenha((v) => !v)}
            aria-expanded={trocandoSenha}
          >
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Trocar senha</span>
            <ChevronRight className={`h-5 w-5 transition-transform ${trocandoSenha ? "rotate-90" : ""}`} aria-hidden="true" />
          </button>
          {trocandoSenha ? (
            <div className="px-4 pb-5 pt-2">
              <FormNovaSenha />
            </div>
          ) : null}
        </li>
        <li>
          <Link href="/perfil" className={ITEM}>
            <UserRound className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Meu perfil de investidor</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <a href="/api/conta/dados" className={ITEM} download>
            <Download className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Baixar meus dados</span>
          </a>
        </li>
        <li>
          <Link href="/termos" className={ITEM}>
            <FileText className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Termos de uso</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link href="/privacidade" className={ITEM}>
            <Shield className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Política de privacidade</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <button type="button" className={ITEM} onClick={sair}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1">Sair</span>
          </button>
        </li>
      </ul>

      <div className="rounded-2xl border border-linha p-4">
        {!excluindo ? (
          <button
            type="button"
            onClick={() => setExcluindo(true)}
            className="flex min-h-11 w-full items-center gap-3 text-left font-medium text-erro"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Excluir minha conta
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-semibold text-texto">Excluir minha conta</h2>
            <p className="text-sm text-texto">
              Vamos apagar sua conta e todos os seus dados: respostas, perfil e carteira. Isso não
              pode ser desfeito.
            </p>
            {erro ? <Alerta>{erro}</Alerta> : null}
            <Campo
              rotulo="Para confirmar, digite EXCLUIR"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <div className="flex flex-col gap-2">
              <Botao
                variante="perigo"
                larguraTotal
                carregando={processando}
                disabled={confirmacao !== "EXCLUIR"}
                onClick={excluirConta}
              >
                Excluir definitivamente
              </Botao>
              <Botao
                variante="secundario"
                larguraTotal
                onClick={() => {
                  setExcluindo(false);
                  setConfirmacao("");
                  setErro(null);
                }}
              >
                Cancelar
              </Botao>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
