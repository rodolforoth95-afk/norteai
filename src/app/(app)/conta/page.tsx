import { exigirUsuario } from "@/lib/servidor/sessao";
import { AcoesConta } from "./AcoesConta";

// Tela 9 — Conta
export default async function PaginaConta() {
  const { usuario, email, teste } = await exigirUsuario();
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-texto">Conta</h1>
      <dl className="rounded-2xl border border-linha bg-superficie p-5">
        <dt className="text-xs text-suave">Nome</dt>
        <dd className="font-medium text-texto">{usuario?.nome_completo}</dd>
        <dt className="mt-3 text-xs text-suave">E-mail</dt>
        <dd className="break-all font-medium text-texto">{email}</dd>
        <dt className="mt-3 text-xs text-suave">Plano</dt>
        <dd className="font-medium text-texto">
          {usuario?.plano === "premium" ? "Premium" : "Gratuito"}
        </dd>
      </dl>
      <AcoesConta teste={teste} />
    </section>
  );
}
