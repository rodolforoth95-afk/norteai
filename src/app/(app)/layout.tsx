import Link from "next/link";
import { Coins } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { BarraLateral } from "@/components/BarraLateral";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { resumoMoedas } from "@/lib/dominio/moedas";
import { hojeBR } from "@/lib/dominio/carteira";
import { carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel } from "@/lib/servidor/ia";
import { ProvedorLancador } from "@/components/financas/Lancador";
import type { ItemHistorico } from "@/components/financas/FormLancamento";
import type { FinancasDados } from "@/lib/dominio/financas";

// Descrições já usadas (para autocompletar), das mais frequentes para as menos.
function historicoDe(d: FinancasDados): ItemHistorico[] {
  const mapa = new Map<string, ItemHistorico & { ultima: string }>();
  for (const l of d.lancamentos) {
    const chave = `${l.tipo}:${l.descricao.toLowerCase()}`;
    const atual = mapa.get(chave);
    if (!atual) mapa.set(chave, { descricao: l.descricao, estabelecimento: l.estabelecimento, categoriaId: l.categoriaId, tipo: l.tipo, meio: l.meio, valor: l.valor, usos: 1, ultima: l.data });
    else {
      atual.usos++;
      if (l.data >= atual.ultima) Object.assign(atual, { categoriaId: l.categoriaId, meio: l.meio, valor: l.valor, ultima: l.data });
    }
  }
  return [...mapa.values()].sort((a, b) => b.usos - a.usos).slice(0, 200).map(({ ultima: _ultima, ...h }) => h);
}

// Celular: cabeçalho no topo e abas embaixo. Computador: menu lateral e conteúdo largo.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const [moedas, financas] = await Promise.all([repo.listarMoedas(uid), carregarFinancas(repo, uid)]);
  const { saldo, nivel } = resumoMoedas(moedas);
  const contexto = { categorias: financas.categorias, regras: financas.regras, historico: historicoDe(financas), hoje: hojeBR() };
  return (
    <ProvedorLancador contexto={contexto} ia={iaDisponivel()}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-superficie focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      <BarraLateral saldo={saldo} nivel={nivel} nome={primeiroNome} />

      <header className="vidro sticky top-0 z-20 border-b border-linha lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-[76rem] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/inicio" aria-label="Início">
            <Logo tamanho="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/aprender#coins"
              className="flex h-9 items-center gap-1.5 rounded-full border border-linha bg-superficie px-3 text-sm font-semibold tabular-nums text-texto"
              aria-label={`${saldo} coins, nível ${nivel}`}
            >
              <Coins className="h-4 w-4 text-gravata" aria-hidden="true" />
              {saldo.toLocaleString("pt-BR")}
            </Link>
            <Link
              href="/conta"
              aria-label="Conta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-linha bg-superficie font-display text-sm font-extrabold text-texto"
            >
              {(primeiroNome || "?").charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo" className="lg:pl-64">
        <div className="mx-auto w-full max-w-[76rem] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      <TabBar />
    </ProvedorLancador>
  );
}
