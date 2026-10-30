import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { estadoEm, hojeBR, ordenarMovimentacoes, serieMensal } from "@/lib/dominio/carteira";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarCarteira } from "@/lib/servidor/carteira";
import { DetalheInvestimento } from "./DetalheInvestimento";

export const metadata = { title: "Investimento" };

export default async function PaginaInvestimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { uid, repo } = await exigirUsuario();
  const carteira = await carregarCarteira(repo, uid);
  const inv = carteira.investimentos.find((i) => i.id === id);
  if (!inv) notFound();

  const hoje = hojeBR();
  const estado = estadoEm(inv, hoje);
  const total = carteira.investimentos.reduce((s, i) => s + estadoEm(i, hoje).saldo, 0);
  const serie = serieMensal({ versao: 2, investimentos: [inv], atualizada_em: carteira.atualizada_em }, hoje);

  // Saldo depois de cada movimentação, para o extrato.
  let saldo = 0;
  const extrato = ordenarMovimentacoes(inv.movimentacoes).map((m) => {
    saldo = m.tipo === "aplicacao" ? saldo + m.valor : m.tipo === "resgate" ? Math.max(0, saldo - m.valor) : m.valor;
    return { ...m, saldoDepois: saldo };
  });

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link href="/carteira" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Carteira
      </Link>
      <DetalheInvestimento
        investimento={{ id: inv.id, nome: inv.nome, classe: inv.classe, quantidade: inv.quantidade }}
        estado={estado}
        pctCarteira={total > 0 ? (estado.saldo / total) * 100 : 0}
        serie={serie.map((p) => ({ mes: p.mes, saldo: p.saldo, aplicado: p.aplicado, rendimento: p.rendimento }))}
        extrato={extrato.reverse()}
      />
    </section>
  );
}
