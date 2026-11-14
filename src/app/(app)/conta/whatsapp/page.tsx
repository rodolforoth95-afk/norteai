import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { armazemWhatsApp } from "@/lib/servidor/whatsapp/armazem";
import {
  ehOperadorWhatsApp,
  mascararTelefone,
  numeroWhatsAppFindomo,
} from "@/lib/servidor/whatsapp/operacao";
import { ConectarWhatsApp } from "./ConectarWhatsApp";
import { PainelCanal } from "./PainelCanal";

export const metadata = { title: "WhatsApp" };

// Conta › WhatsApp: liga o número da pessoa à conta (código de uso único) e, para quem
// opera o canal, mostra o estado do número do Findomo e o QR para parear.
export default async function PaginaWhatsApp() {
  const { uid, email, teste } = await exigirUsuario();
  const armazem = armazemWhatsApp();
  const vinculo = await armazem.vinculoDoUsuario(uid).catch(() => null);
  const operador = ehOperadorWhatsApp(email, teste);
  const canal = operador ? await armazem.obterCanal().catch(() => null) : null;
  const numero = numeroWhatsAppFindomo();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-10">
      <div className="flex flex-col gap-2">
        <Link
          href="/conta"
          className="flex w-fit items-center gap-1 text-sm font-medium text-suave hover:text-texto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Conta
        </Link>
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.01em] text-texto">
          WhatsApp
        </h1>
        <p className="text-sm text-suave">
          Lance receitas e despesas e pergunte sobre o seu dinheiro, a sua
          carteira e a bolsa, direto pelo WhatsApp. Tudo cai na sua conta na
          hora.
        </p>
      </div>

      <ConectarWhatsApp
        vinculo={
          vinculo
            ? {
                telefone: mascararTelefone(vinculo.telefone),
                desde: vinculo.vinculadoEm,
              }
            : null
        }
        numeroFindomo={numero}
      />

      {operador ? (
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
      ) : null}
    </section>
  );
}
