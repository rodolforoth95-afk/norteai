import { AvisoEducacional } from "@/components/AvisoEducacional";
import { hojeBR } from "@/lib/dominio/carteira";
import { avaliar, fotografar } from "@/lib/dominio/conta-simulada";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { brapiDisponivel, cotacao, cotacoes } from "@/lib/servidor/brapi";
import { indicadores } from "@/lib/servidor/indicadores";
import { AbasSimulador } from "../AbasSimulador";
import { ContaSimuladaPainel, CriarContaSimulada } from "./ContaSimuladaPainel";

export const metadata = { title: "Conta simulada" };

// Conta simulada: dinheiro fictício, cotações reais. Uma foto por dia monta a linha do tempo
// comparando com o CDI e o Ibovespa desde a criação.
export default async function PaginaContaSimulada() {
  const { uid, repo } = await exigirUsuario();
  const conta = await repo.obterContaSimulada(uid);
  const hoje = hojeBR();

  const cabecalho = (
    <header className="flex flex-col gap-4">
      <AbasSimulador />
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">Conta simulada</h1>
        <p className="mt-1 text-sm text-suave">Monte uma carteira com dinheiro fictício e acompanhe com as cotações reais, dia a dia, contra o CDI e o Ibovespa.</p>
      </div>
    </header>
  );

  if (!conta) {
    return (
      <section className="flex flex-col gap-6">
        {cabecalho}
        <CriarContaSimulada />
        <AvisoEducacional extra="Simulação com dinheiro fictício; não é recomendação de compra ou venda." />
      </section>
    );
  }

  const codigos = conta.posicoes.flatMap((p) => (p.tipo === "bolsa" ? [p.codigo] : []));
  const [lista, ind, ibov] = await Promise.all([
    codigos.length && brapiDisponivel() ? cotacoes(codigos).catch(() => []) : Promise.resolve([]),
    indicadores(),
    brapiDisponivel() ? cotacao("^BVSP").then((c) => c.preco).catch(() => null) : Promise.resolve(null),
  ]);
  const precos = Object.fromEntries(lista.map((c) => [c.simbolo, c.preco]));
  const av = avaliar(conta, precos, ind.cdi, hoje);
  const ultimaFoto = conta.historico.at(-1);
  if (!ultimaFoto || ultimaFoto.data !== hoje || Math.abs(ultimaFoto.valor - av.total) > 0.01) {
    fotografar(conta, av.total, av.cdiNoPeriodo, ibov, hoje);
    await repo.salvarContaSimulada(uid, conta).catch(() => undefined);
  }

  return (
    <section className="flex flex-col gap-6">
      {cabecalho}
      <ContaSimuladaPainel
        conta={{ criada_em: conta.criada_em, saldoInicial: conta.saldoInicial, caixa: conta.caixa, operacoes: conta.operacoes.slice(0, 20), historico: conta.historico }}
        avaliacao={av}
        cdi={ind.cdi}
        ibovPct={conta.ibovInicial && ibov ? (ibov / conta.ibovInicial - 1) * 100 : null}
      />
      <AvisoEducacional extra="Simulação com dinheiro fictício e cotações com atraso de até 30 minutos; não é recomendação de compra ou venda." />
    </section>
  );
}
