import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { AcoesConta } from "./AcoesConta";
import { AlternarTema } from "@/components/AlternarTema";

export const metadata = { title: "Conta" };

// Tela 9 — Conta
export default async function PaginaConta() {
  const { usuario, email, teste } = await exigirUsuario();
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.01em] text-texto">
        Conta
      </h1>
      <dl className="painel p-5">
        <dt className="text-xs text-suave">Nome</dt>
        <dd className="font-medium text-texto">{usuario?.nome_completo}</dd>
        <dt className="mt-3 text-xs text-suave">E-mail</dt>
        <dd className="break-all font-medium text-texto">{email}</dd>
        <dt className="mt-3 text-xs text-suave">Plano</dt>
        <dd className="font-medium text-texto">
          {usuario?.plano === "premium" ? "Premium" : "Gratuito"}
        </dd>
      </dl>
      <Link
        href="/conta/whatsapp"
        className="painel flex min-h-16 items-center gap-3 p-4 hover:bg-superficie-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-menta/15 text-menta">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-texto">WhatsApp</span>
          <span className="block text-sm text-suave">
            Lance e consulte suas finanças pelo WhatsApp
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-suave" aria-hidden="true" />
      </Link>
      {/* No computador o botão de tema fica no menu lateral. */}
      <div className="lg:hidden">
        <AlternarTema comRotulo />
      </div>
      <AcoesConta teste={teste} />
    </section>
  );
}
