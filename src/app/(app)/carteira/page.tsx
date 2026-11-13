import Link from "next/link";
import { FileText, Keyboard, Plus } from "lucide-react";
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
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">Carteira</h1>
        <div className="borda-gradiente flex flex-col gap-6 rounded-2xl p-6 lg:p-8">
          <div className="max-w-2xl">
            <p className="font-display text-xl font-semibold text-texto">Nenhum investimento cadastrado</p>
            <p className="mt-1 text-sm leading-relaxed text-suave">
              Cadastre o que você tem hoje e registre os saldos uma vez por mês. O Findomo separa o rendimento do dinheiro que você aplicou e mostra quanto isso
              representa do CDI, da poupança e da inflação no mesmo período.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            {[
              { href: "/carteira/importar", Icone: FileText, titulo: "Enviar extrato", texto: "Posição da B3, PDF da corretora ou print · 2 min" },
              { href: "/carteira/importar", Icone: Keyboard, titulo: "Digitar saldos", texto: "Lista com o valor de hoje de cada um · 3 min" },
              { href: "/carteira/adicionar", Icone: Plus, titulo: "Um por um", texto: "Com a data e o valor de cada aplicação · 1 min" },
            ].map(({ href, Icone, titulo, texto }) => (
              <Link key={titulo} href={href} className="flex flex-col gap-1.5 rounded-xl border border-linha bg-superficie p-4 transition hover:border-ciano hover:bg-superficie-2">
                <Icone className="h-5 w-5 text-ciano" aria-hidden="true" />
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
