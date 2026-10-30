import Link from "next/link";
import { FileText, Keyboard, PieChart, Plus } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { calcularAderencia, percentuais, pontosDeAtencao, totalPorClasse } from "@/lib/dominio/motor";
import { posicoesAtuais, resumoCarteira } from "@/lib/dominio/carteira";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarCarteira } from "@/lib/servidor/carteira";
import { taxasMensais } from "@/lib/servidor/indicadores";
import { brapiDisponivel } from "@/lib/servidor/brapi";
import { BotaoExemplo } from "./BotaoExemplo";
import { PainelCarteira } from "./PainelCarteira";

export const metadata = { title: "Carteira" };

// Painel da carteira: patrimônio, rendimento separado dos aportes, linha histórica
// com comparativos (CDI, poupança, inflação), composição e cada investimento.
export default async function PaginaCarteira() {
  const { uid, repo, teste } = await exigirUsuario();
  const [carteira, perfil, taxas] = await Promise.all([carregarCarteira(repo, uid), repo.obterPerfil(uid), taxasMensais()]);
  const resumo = resumoCarteira(carteira);

  if (!carteira.investimentos.length) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-texto lg:text-3xl">Carteira</h1>
        <div className="borda-gradiente flex flex-col gap-6 rounded-3xl p-6 lg:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="gradiente-marca flex h-16 w-16 items-center justify-center rounded-2xl text-black">
              <PieChart className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="font-display text-2xl font-semibold text-texto">Monte o mapa dos seus investimentos</p>
            <p className="max-w-xl text-sm text-suave">
              Cadastre o que você já tem. Depois, atualize os saldos todo mês: o app separa o que é dinheiro novo do que é rendimento e compara com o CDI, a
              poupança e a inflação.
            </p>
          </div>
          <div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            {[
              { href: "/carteira/importar", Icone: FileText, titulo: "Importar extrato", texto: "PDF, planilha da B3 ou print da corretora" },
              { href: "/carteira/adicionar", Icone: Plus, titulo: "Adicionar um a um", texto: "Com a data e o valor de cada aplicação" },
              { href: "/carteira/importar", Icone: Keyboard, titulo: "Digitar vários", texto: "Uma lista rápida com os saldos de hoje" },
            ].map(({ href, Icone, titulo, texto }) => (
              <Link key={titulo} href={href} className="flex flex-col gap-2 rounded-2xl border border-linha bg-superficie p-4 transition hover:border-ciano">
                <Icone className="h-6 w-6 text-ciano" aria-hidden="true" />
                <span className="font-semibold text-texto">{titulo}</span>
                <span className="text-xs text-suave">{texto}</span>
              </Link>
            ))}
          </div>
          {teste ? (
            <div className="mx-auto w-full max-w-sm">
              <BotaoExemplo />
            </div>
          ) : null}
        </div>
        <AvisoEducacional />
      </section>
    );
  }

  const posicoes = posicoesAtuais(carteira);
  const { pct } = percentuais(totalPorClasse(posicoes));
  const aderencia = perfil ? calcularAderencia(pct, perfil.estilo) : null;
  const pontos = pontosDeAtencao(posicoes, perfil);

  return (
    <section className="flex flex-col gap-6">
      <PainelCarteira
        serie={resumo.serie}
        linhas={resumo.linhas.map((l) => ({
          id: l.inv.id,
          nome: l.inv.nome,
          classe: l.inv.classe,
          quantidade: l.inv.quantidade,
          saldo: l.saldo,
          aplicado: l.aplicado,
          rendimento: l.rendimento,
          rentabilidade: l.rentabilidade,
          pctCarteira: l.pctCarteira,
          ultimaData: l.ultimaData,
          diasSemAtualizar: l.diasSemAtualizar,
        }))}
        taxas={taxas}
        aderencia={aderencia && perfil ? { estilo: perfil.estilo, ...aderencia } : null}
        pontos={pontos}
        cotacoes={brapiDisponivel()}
        teste={teste}
      />
      <AvisoEducacional extra="A rentabilidade usa os saldos que você informa. Rentabilidade passada não garante resultado futuro." />
    </section>
  );
}
