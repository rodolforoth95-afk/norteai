"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";
import { desconectarCanalWhatsApp } from "@/app/acoes-whatsapp";

type Props = {
  canal: {
    status: string;
    qr: string | null;
    numero: string | null;
    nome: string | null;
    atualizadoEm: string;
    comandoPendente: string | null;
  } | null;
};

const ROTULOS: Record<string, { texto: string; cor: string }> = {
  conectado: { texto: "Conectado", cor: "text-menta" },
  qr: { texto: "Aguardando leitura do QR", cor: "text-ciano" },
  conectando: { texto: "Reconectando", cor: "text-ciano" },
  iniciando: { texto: "Iniciando", cor: "text-suave" },
  desconectado: { texto: "Desconectado", cor: "text-gravata" },
};

// Só para quem opera o canal: estado do número do Findomo e QR para parear.
export function PainelCanal({ canal }: Props) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const silencioso = canal
    ? Date.now() - Date.parse(canal.atualizadoEm) > 90_000
    : true;

  useEffect(() => {
    const t = setInterval(
      () => router.refresh(),
      canal?.status === "qr" ? 5000 : 30000,
    );
    return () => clearInterval(t);
  }, [router, canal?.status]);

  async function desconectar() {
    await desconectarCanalWhatsApp();
    setConfirmando(false);
    router.refresh();
  }

  const rotulo = canal
    ? (ROTULOS[canal.status] ?? { texto: canal.status, cor: "text-suave" })
    : null;

  return (
    <div className="painel flex flex-col gap-4 border-dashed p-5">
      <div className="flex items-center gap-2">
        <RadioTower className="h-5 w-5 text-ciano" aria-hidden="true" />
        <p className="font-display text-base font-semibold text-texto">
          Canal do Findomo (operação)
        </p>
      </div>
      {!canal ? (
        <p className="text-sm text-suave">
          O serviço do WhatsApp ainda não se comunicou com o site. Suba o
          serviço com as instruções de docs/whatsapp/README.md e esta área
          mostra o QR para parear o número.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-suave">Situação</dt>
              <dd
                className={`font-semibold ${silencioso ? "text-gravata" : rotulo?.cor}`}
              >
                {silencioso ? "Sem sinal do serviço" : rotulo?.texto}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-suave">Número</dt>
              <dd className="font-semibold text-texto">
                {canal.numero ?? "—"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-suave">Último sinal</dt>
              <dd className="text-texto">
                {new Date(canal.atualizadoEm).toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>
          {canal.status === "qr" && canal.qr && !silencioso ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-texto">
                No celular do número do Findomo: WhatsApp › Aparelhos conectados
                › Conectar um aparelho, e aponte para o código.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={canal.qr}
                alt="QR code para conectar o WhatsApp do Findomo"
                className="h-64 w-64 rounded-xl bg-white p-2"
              />
            </div>
          ) : null}
          {canal.comandoPendente ? (
            <p className="text-sm text-suave">
              Pedido de desconexão enviado; o serviço aplica no próximo sinal.
            </p>
          ) : canal.status === "conectado" ? (
            confirmando ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-texto">
                  Desconectar o número? Os clientes param de receber respostas
                  até parear de novo.
                </span>
                <button
                  type="button"
                  onClick={desconectar}
                  className="flex h-10 items-center rounded-full bg-gravata px-4 text-sm font-semibold text-white"
                >
                  Desconectar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="flex h-10 items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="flex h-10 w-fit items-center rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
              >
                Desconectar número
              </button>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
