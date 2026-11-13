import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, GraduationCap, Landmark, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Cartao, TituloSecao } from "@/components/ui";
import { AVISO_MERCADO, EsqueletoLista, LinhaAtivo, SeloVariacao, formatarPreco } from "@/components/mercado";
import { altasDaSemana, brapiDisponivel, cotacao, destaquesDoDia, futuros, historico, listarAtivosComTotal, tesouro } from "@/lib/servidor/brapi";
import { MapaDoDia as MapaInterativo, type GrupoMapa } from "./MapaDoDia";
import { listarCriptos } from "@/lib/servidor/cripto";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { AbasDestaques } from "./AbasDestaques";
import { BuscaAtivos } from "./BuscaAtivos";
import { MiniGrafico } from "./MiniGrafico";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";

export const metadata = { title: "Mercado" };

// Painel de mercado: dados para acompanhar e aprender, nunca indicação.
export default async function PaginaMercado() {
  await exigirUsuario();

  if (!brapiDisponivel()) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto">Mercado</h1>
        <Cartao>
          <p className="text-sm text-suave">Configure BRAPI_TOKEN no .env.local para ver as cotações.</p>
        </Cartao>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">Mercado</h1>
          <p className="text-sm text-suave">Cotações da B3 com até 30 minutos de atraso. Abra um ativo para ver suportes, resistências e o desempenho mês a mês.</p>
        </div>
        <BotaoAtualizar />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="lg:col-span-1">
          <BuscaAtivos />
        </div>
        <Link href="/mercado/comparar" className="flex min-h-14 items-center gap-3 rounded-2xl border border-linha bg-superficie px-4 transition hover:border-ciano">
          <GitCompareArrows className="h-6 w-6 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-texto">Comparar ativos</span>
            <span className="block text-xs text-suave">Até 5 lado a lado, mês a mês</span>
          </span>
          <ArrowRight className="h-4 w-4 text-suave" aria-hidden="true" />
        </Link>
        <Link href="/aprender/suporte-resistencia" className="flex min-h-14 items-center gap-3 rounded-2xl border border-linha bg-superficie px-4 transition hover:border-ciano">
          <GraduationCap className="h-6 w-6 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-texto">Suportes e resistências</span>
            <span className="block text-xs text-suave">Aprenda a ler o gráfico de cada ativo</span>
          </span>
          <ArrowRight className="h-4 w-4 text-suave" aria-hidden="true" />
        </Link>
      </div>

      <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-superficie" />}>
        <MapaDoDia />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
      <Suspense fallback={<div className="h-44 animate-pulse rounded-2xl bg-superficie" />}>
        <CartaoIbovespa />
      </Suspense>

      <Suspense fallback={<Cartao><EsqueletoLista /></Cartao>}>
        <Destaques />
      </Suspense>
        </div>
        <div className="flex min-w-0 flex-col gap-6">

      <Suspense
        fallback={
          <Cartao>
            <TituloSecao titulo="Maiores altas da semana" subtitulo="Calculando os últimos 5 pregões…" />
            <EsqueletoLista />
          </Cartao>
        }
      >
        <Semana />
      </Suspense>

      <Suspense fallback={<Cartao><EsqueletoLista /></Cartao>}>
        <Criptomoedas />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-superficie" />}>
        <RendaFixaEFuturos />
      </Suspense>
        </div>
      </div>

      <AvisoEducacional extra={AVISO_MERCADO} />
    </section>
  );
}

// Mapa de calor do dia: os ativos mais negociados de cada tipo (4 requisições, 15 min de cache).
async function MapaDoDia() {
  const tipos = [
    { id: "acoes", rotulo: "Ações", descricao: "Entre as 60 ações mais negociadas hoje.", params: { tipo: "stock" as const } },
    { id: "fiis", rotulo: "FIIs", descricao: "Entre os 60 fundos imobiliários mais negociados hoje.", params: { subtipo: "fii" as const } },
    { id: "etfs", rotulo: "ETFs", descricao: "Entre os 60 ETFs mais negociados hoje.", params: { subtipo: "etf" as const } },
    { id: "bdrs", rotulo: "BDRs", descricao: "Entre os 60 BDRs (empresas de fora) mais negociados hoje.", params: { tipo: "bdr" as const } },
  ];
  const grupos: GrupoMapa[] = [];
  for (const t of tipos) {
    try {
      const { itens, total } = await listarAtivosComTotal({ ...t.params, ordenar: "volume", limite: 70 });
      const validos = itens
        .filter((a) => a.variacaoPct !== null && a.preco !== null)
        .slice(0, 60)
        .map((a) => ({ simbolo: a.simbolo, nome: a.nome, logo: a.logo, variacaoPct: a.variacaoPct!, preco: a.preco! }));
      if (validos.length) grupos.push({ id: t.id, rotulo: t.rotulo, descricao: t.descricao, total, itens: validos });
    } catch {
      // Um tipo com falha não derruba o mapa.
    }
  }
  const criptos = (await listarCriptos(30)).filter((c) => c.variacao24h !== null);
  if (criptos.length) {
    grupos.push({
      id: "cripto",
      rotulo: "Cripto",
      descricao: "Entre as 30 maiores criptomoedas por valor de mercado, variação em 24 horas (CoinGecko).",
      total: criptos.length,
      itens: criptos.map((c) => ({ simbolo: c.simbolo, nome: c.nome, logo: c.logo, variacaoPct: c.variacao24h!, preco: c.preco, href: `/mercado/cripto/${c.id}` })),
    });
  }
  if (!grupos.length) return null;
  return <MapaInterativo grupos={grupos} />;
}

async function CartaoIbovespa() {
  const [ibov, pontos] = await Promise.all([cotacao("^BVSP").catch(() => null), historico("^BVSP", "1mo").catch(() => [])]);
  if (!ibov) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-linha bg-superficie p-5">
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-texto">
            <LineChart className="h-4 w-4" aria-hidden="true" />
            Ibovespa
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-texto">
            {ibov.preco.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} <span className="text-base text-suave">pts</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SeloVariacao valor={ibov.variacaoPct} grande />
          <Link href="/mercado/%5EBVSP" className="text-xs font-semibold text-ciano">Ver gráfico</Link>
        </div>
      </div>
      {pontos.length > 1 ? <MiniGrafico pontos={pontos} /> : null}
      <p className="relative mt-1 text-xs text-suave">
        Últimos 30 dias · principal índice da bolsa brasileira
        {ibov.horario ? ` · cotação das ${new Date(ibov.horario).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </p>
    </div>
  );
}

async function Destaques() {
  const d = await destaquesDoDia().catch(() => null);
  if (!d) return <Cartao><p className="text-sm text-suave">Não foi possível carregar os destaques agora.</p></Cartao>;
  return (
    <AbasDestaques
      abas={[
        { id: "altas", rotulo: "Altas do dia", descricao: "Entre as 120 ações mais negociadas hoje", itens: d.altas },
        { id: "baixas", rotulo: "Baixas do dia", descricao: "Entre as 120 ações mais negociadas hoje", itens: d.baixas },
        { id: "volume", rotulo: "Mais negociadas", descricao: "Maior volume de negócios hoje", itens: d.maisNegociadas },
        { id: "fiis", rotulo: "FIIs", descricao: "Fundos imobiliários mais negociados hoje", itens: d.fiis },
        { id: "etfs", rotulo: "ETFs", descricao: "ETFs mais negociados hoje", itens: d.etfs },
      ]}
    />
  );
}

async function Semana() {
  const lista = await altasDaSemana().catch(() => []);
  if (!lista.length) return null;
  const altas = lista.filter((a) => a.variacaoPct > 0).slice(0, 6);
  const baixas = [...lista].reverse().filter((a) => a.variacaoPct < 0).slice(0, 3);
  return (
    <Cartao className="flex flex-col gap-4">
      <TituloSecao titulo="Maiores altas da semana" subtitulo="Variação nos últimos 5 pregões, entre as 20 ações mais negociadas" />
      <p className="flex items-center gap-1.5 text-sm font-semibold text-menta">
        <TrendingUp className="h-4 w-4" aria-hidden="true" /> Subiram
      </p>
      <ul className="-mx-2 flex flex-col">
        {altas.map((a, i) => (
          <LinhaAtivo key={a.simbolo} posicao={i + 1} simbolo={a.simbolo} nome={a.nome} logo={a.logo} preco={a.preco} variacaoPct={a.variacaoPct} />
        ))}
      </ul>
      {baixas.length ? (
        <>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-erro">
            <TrendingDown className="h-4 w-4" aria-hidden="true" /> Caíram
          </p>
          <ul className="-mx-2 flex flex-col">
            {baixas.map((a) => (
              <LinhaAtivo key={a.simbolo} simbolo={a.simbolo} nome={a.nome} logo={a.logo} preco={a.preco} variacaoPct={a.variacaoPct} />
            ))}
          </ul>
        </>
      ) : null}
      <p className="text-xs text-suave">
        Ativos com salto de mais de 30% em um único dia ficam de fora: costumam ser desdobramentos ou outros eventos que distorcem a comparação.
      </p>
    </Cartao>
  );
}

// As maiores criptomoedas (CoinGecko, em reais): a brapi não cobre cripto no plano atual.
async function Criptomoedas() {
  const lista = (await listarCriptos(30)).filter((c) => !/^(USDT|USDC|DAI|FDUSD|TUSD|USDE|USDS|BUSD|PYUSD|WBTC|STETH|WSTETH|WETH|WEETH|CBBTC)$/.test(c.simbolo)).slice(0, 8);
  if (!lista.length) return null;
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloSecao titulo="Criptomoedas" subtitulo="As maiores por valor de mercado, em reais · variação em 24 horas" />
      <ul className="-mx-2 flex flex-col">
        {lista.map((c, i) => (
          <LinhaAtivo key={c.id} posicao={i + 1} simbolo={c.simbolo} nome={c.nome} logo={c.logo} preco={c.preco} variacaoPct={c.variacao24h} href={`/mercado/cripto/${c.id}`} />
        ))}
      </ul>
      <p className="text-xs text-suave">Dados da CoinGecko, atualizados a cada 5 minutos. Stablecoins e versões “embrulhadas” ficam de fora da lista.</p>
    </Cartao>
  );
}

async function RendaFixaEFuturos() {
  const [titulos, win, wdo] = await Promise.all([tesouro(), futuros("WIN"), futuros("WDO")]);
  if (!titulos.length && !win && !wdo) return null;
  return (
    <div className="grid gap-4">
      {titulos.length ? (
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Tesouro Direto" subtitulo="Taxas de compra divulgadas pelo Tesouro Nacional" />
          {titulos.map((t) => (
            <div key={t.simbolo} className="flex items-center gap-3 rounded-2xl bg-superficie-2 px-4 py-3">
              <Landmark className="h-6 w-6 shrink-0 text-ciano" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-texto">{t.nome}</p>
                <p className="text-xs text-suave">Vence em {new Date(`${t.vencimento}T12:00:00`).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-bold text-texto">
                  {t.unidadeTaxa} {t.taxaCompra?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%
                </p>
                <p className="text-xs text-suave">{formatarPreco(t.precoCompra)} por título</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-suave">O plano atual da brapi libera só este título. Os demais exigem o plano Pro.</p>
        </Cartao>
      ) : null}

      {win || wdo ? (
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Mercado futuro" subtitulo="Contrato com vencimento mais próximo · fechamento do pregão anterior" />
          <div className="grid grid-cols-2 gap-3">
            {[win, wdo].filter(Boolean).map((f) => (
              <div key={f!.simbolo} className="rounded-2xl bg-superficie-2 p-4">
                <p className="font-display text-sm font-bold text-texto">{f!.simbolo}</p>
                <p className="text-xs text-suave">{f!.descricao}</p>
                <p className="mt-2 font-display text-lg font-bold tabular-nums text-texto">
                  {f!.fechamento?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) ?? "—"}
                </p>
                <SeloVariacao valor={f!.variacaoPct} />
              </div>
            ))}
          </div>
          <p className="text-xs text-suave">Contratos futuros são instrumentos complexos e de alto risco, usados por investidores experientes.</p>
        </Cartao>
      ) : null}
    </div>
  );
}
