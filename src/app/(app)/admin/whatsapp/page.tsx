import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { armazemWhatsApp } from "@/lib/servidor/whatsapp/armazem";
import {
  ehOperadorWhatsApp,
  mascararTelefone,
  numeroWhatsAppFindomo,
} from "@/lib/servidor/whatsapp/operacao";
import { PainelCanal } from "./PainelCanal";
import { ConfigAtendimento } from "./ConfigAtendimento";

export const metadata = { title: "Admin · WhatsApp" };
export const dynamic = "force-dynamic";

function inicioDoDiaBR() {
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  return new Date(`${hoje}T00:00:00-03:00`).toISOString();
}

// Admin do WhatsApp: o número do Findomo (QR para parear, situação, desconectar),
// ligar ou pausar o atendimento e quem está usando.
export default async function PaginaAdminWhatsApp() {
  const { email, teste } = await exigirUsuario();
  if (!ehOperadorWhatsApp(email, teste)) notFound();
  const armazem = armazemWhatsApp();
  const [canal, config, resumo] = await Promise.all([
    armazem.obterCanal().catch(() => null),
    armazem.obterConfig().catch(() => null),
    armazem.resumoAdmin(inicioDoDiaBR()).catch(() => null),
  ]);
  const numeroConfigurado = numeroWhatsAppFindomo();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 font-display text-[1.75rem] font-bold tracking-[-0.01em] text-texto">
          <MessageCircle className="h-6 w-6 text-ciano" aria-hidden="true" />
          Admin · WhatsApp
        </h1>
        <p className="text-sm text-suave">
          O número do WhatsApp do Findomo, o atendimento do Mordomo e os
          clientes ligados. Cada cliente é reconhecido pelo celular que
          cadastrou na conta.
        </p>
      </div>

      {!config || !resumo ? (
        <p className="painel border-gravata/40 p-4 text-sm text-texto">
          O banco ainda não tem as tabelas do WhatsApp. No Supabase, abra o SQL
          Editor e rode, nesta ordem, <code>0007_whatsapp.sql</code> e{" "}
          <code>0008_whatsapp_telefone_admin.sql</code> (pasta
          supabase/migrations).
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-texto">
          1. Número do Findomo
        </h2>
        <PainelCanal
          canal={
            canal
              ? {
                  status: canal.status,
                  qr: canal.qr,
                  numero: canal.numero ? mascararTelefone(canal.numero) : null,
                  nome: canal.nome,
                  atualizadoEm: canal.atualizadoEm,
                  comandoPendente: canal.comando,
                }
              : null
          }
        />
        {!numeroConfigurado && canal?.status !== "conectado" ? (
          <p className="text-xs text-suave">
            Depois de parear, o número aparece sozinho para os clientes no botão
            &quot;Abrir conversa&quot;.
          </p>
        ) : null}
      </div>

      {config ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-texto">
            2. Atendimento
          </h2>
          <ConfigAtendimento
            atendimento={config.atendimento}
            mensagemPausa={config.mensagemPausa ?? ""}
          />
        </div>
      ) : null}

      {resumo ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-texto">
            3. Clientes
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { rotulo: "Conversando", valor: resumo.ligados },
              { rotulo: "Cadastrados, sem conversar", valor: resumo.aguardando },
              { rotulo: "Mensagens hoje", valor: resumo.mensagensHoje },
            ].map((c) => (
              <div key={c.rotulo} className="painel flex flex-col gap-1 p-4">
                <span className="font-display text-2xl font-bold tabular-nums text-texto">
                  {c.valor.toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-suave">{c.rotulo}</span>
              </div>
            ))}
          </div>
          {resumo.clientes.length ? (
            <div className="painel overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-suave">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Celular</th>
                    <th className="px-4 py-3 font-medium">Desde</th>
                    <th className="px-4 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.clientes.map((c) => (
                    <tr key={c.usuarioId} className="border-t border-linha">
                      <td className="px-4 py-3 text-texto">{c.nome ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-texto">
                        {mascararTelefone(c.telefone)}
                      </td>
                      <td className="px-4 py-3 text-suave">
                        {new Date(c.vinculadoEm).toLocaleDateString("pt-BR")}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${c.confirmado ? "text-menta" : "text-suave"}`}
                      >
                        {c.confirmado ? "Conversando" : "Aguardando 1º oi"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-suave">
              Nenhum cliente ligado ainda. Ao cadastrar o celular (no cadastro
              ou em Conta › WhatsApp), ele aparece aqui.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
