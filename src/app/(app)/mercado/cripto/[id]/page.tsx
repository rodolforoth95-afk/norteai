import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap, TriangleAlert } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Cartao, TituloSecao } from "@/components/ui";
import { LogoAtivo, SeloVariacao } from "@/components/mercado";
import { leiturasEducativas, niveisDePreco, pivosMensais } from "@/lib/dominio/tecnica";
import { candlesCripto, cripto } from "@/lib/servidor/cripto";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { PainelTecnico } from "../../[simbolo]/PainelTecnico";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = await cripto((await params).id);
  return { title: c ? `${c.nome} (${c.simbolo})` : "Cripto" };
}

const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v < 10 ? 4 : 2 });
const compacto = (v: number | null) => (v === null ? "—" : `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`);
const pct = (v: number | null) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Página de uma criptomoeda: cotação em reais (CoinGecko), gráfico com suportes e
// resistências dos últimos 90 dias e os números que mais importam para entender o risco.
export default async function PaginaCripto({ params }: { params: Promise<{ id: string }> }) {
  await exigirUsuario();
  const { id } = await params;
  const [c, velas] = await Promise.all([cripto(id), candlesCripto(id)]);
  if (!c) notFound();

  const ultimo = velas.at(-1);
  if (ultimo) velas[velas.length - 1] = { ...ultimo, fechamento: c.preco, maxima: Math.max(ultimo.maxima, c.preco), minima: Math.min(ultimo.minima, c.preco) };
  const niveis = niveisDePreco(velas, c.preco);
  const pivos = pivosMensais(velas, c.preco);
  const leituras = leiturasEducativas(velas, niveis, c.preco, (v) => brl(v));
  const estavel = /^(USDT|USDC|DAI|FDUSD|TUSD|USDE|BUSD|PYUSD|USDS)$/.test(c.simbolo);

  const numeros: [string, string, string?][] = [
    ["Valor de mercado", compacto(c.valorMercado), c.posicao ? `${c.posicao}ª maior cripto` : undefined],
    ["Volume em 24 h", compacto(c.volume24h)],
    ["Máxima em 24 h", brl(c.maxima24h)],
    ["Mínima em 24 h", brl(c.minima24h)],
    ["Variação em 7 dias", pct(c.variacao7d)],
    ["Variação em 30 dias", pct(c.variacao30d)],
    [
      "Máxima histórica",
      brl(c.maximaHistorica),
      c.dataMaximaHistorica ? `em ${new Date(c.dataMaximaHistorica).toLocaleDateString("pt-BR")} · hoje ${pct(c.quedaDaMaxima)}` : undefined,
    ],
    [
      "Em circulação",
      c.emCirculacao ? `${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 }).format(c.emCirculacao)} ${c.simbolo}` : "—",
      c.ofertaMaxima ? `de ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 }).format(c.ofertaMaxima)} no máximo` : "sem limite de emissão",
    ],
  ];

  return (
    <article className="flex flex-col gap-6">
      <Link href="/mercado" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Mercado
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <LogoAtivo simbolo={c.simbolo} logo={c.logo} tamanho={56} />
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">{c.nome}</h1>
            <p className="text-sm text-suave">
              {c.simbolo} · criptomoeda{c.posicao ? ` · ${c.posicao}ª em valor de mercado` : ""}
            </p>
          </div>
        </div>
        <div className="lg:text-right">
          <p className="font-display text-3xl font-bold tabular-nums text-texto lg:text-4xl">{brl(c.preco)}</p>
          <p className="mt-1 flex items-center gap-2 lg:justify-end">
            <SeloVariacao valor={c.variacao24h} grande />
            <span className="text-sm text-suave">em 24 horas</span>
          </p>
        </div>
      </header>

      {estavel ? (
        <p className="flex items-start gap-2 rounded-xl border border-linha border-l-4 border-l-gravata bg-superficie px-4 py-3 text-sm text-suave">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gravata" aria-hidden="true" />
          {c.simbolo} é uma stablecoin: foi criada para acompanhar o dólar, por isso o preço em reais varia com o câmbio, não com o mercado de cripto.
        </p>
      ) : null}

      {velas.length >= 10 ? (
        <PainelTecnico simbolo={c.simbolo} indice={false} candles={velas} niveis={niveis} pivos={pivos} leituras={leituras} periodoAnalise="90 dias" comparavel={false} />
      ) : (
        <Cartao>
          <p className="text-sm text-suave">Histórico indisponível agora. Tente de novo em alguns minutos.</p>
        </Cartao>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Cartao className="flex flex-col gap-4">
          <TituloSecao titulo="Números de hoje" subtitulo="Cotação em reais pela CoinGecko, atualizada a cada 5 minutos" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            {numeros.map(([rotulo, valor, extra]) => (
              <div key={rotulo} className="border-b border-linha pb-2">
                <dt className="text-xs text-suave">{rotulo}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-texto">{valor}</dd>
                {extra ? <dd className="text-xs text-suave">{extra}</dd> : null}
              </div>
            ))}
          </dl>
        </Cartao>
        <Link href="/aprender/cripto" className="borda-gradiente flex items-center gap-4 rounded-2xl p-5">
          <GraduationCap className="h-7 w-7 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm text-suave">Antes de comprar qualquer cripto</span>
            <span className="block font-display font-semibold text-texto">Como funcionam as criptomoedas e onde guardar</span>
          </span>
          <ArrowRight className="h-5 w-5 text-suave" aria-hidden="true" />
        </Link>
      </div>

      <AvisoEducacional extra="Criptomoedas podem cair mais de 50% em poucos meses e não têm garantia do FGC. Rentabilidade passada não garante resultado futuro." />
    </article>
  );
}
