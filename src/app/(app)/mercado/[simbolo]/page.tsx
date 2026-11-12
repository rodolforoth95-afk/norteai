import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, GitCompareArrows, GraduationCap } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Cartao, TituloSecao } from "@/components/ui";
import { AVISO_MERCADO, LogoAtivo, SeloVariacao, formatarCompacto, formatarPreco } from "@/components/mercado";
import { CLASSES } from "@/lib/dominio/catalogo";
import { classificar } from "@/lib/dominio/classificar";
import { PERIODO_ANALISE, candles as buscarCandles, cotacao, perfilEmpresa } from "@/lib/servidor/brapi";
import { leiturasEducativas, niveisDePreco, pivosMensais } from "@/lib/dominio/tecnica";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { PainelTecnico } from "./PainelTecnico";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";

export async function generateMetadata({ params }: { params: Promise<{ simbolo: string }> }) {
  const simbolo = decodeURIComponent((await params).simbolo).toUpperCase();
  return { title: simbolo === "^BVSP" ? "Ibovespa" : simbolo };
}

export default async function PaginaAtivo({ params }: { params: Promise<{ simbolo: string }> }) {
  await exigirUsuario();
  const simbolo = decodeURIComponent((await params).simbolo).toUpperCase();
  if (!/^\^?[A-Z0-9]{3,12}$/.test(simbolo)) notFound();

  const c = await cotacao(simbolo).catch(() => null);
  if (!c) notFound();
  const indice = simbolo.startsWith("^");
  const [velas, perfil] = await Promise.all([buscarCandles(simbolo).catch(() => []), indice ? null : perfilEmpresa(simbolo)]);
  const classe = indice ? null : classificar(simbolo);
  // O histórico e a cotação atualizam em momentos diferentes: o candle de hoje usa a cotação atual.
  const hoje = new Date().toISOString().slice(0, 10);
  const ultimo = velas.at(-1);
  if (ultimo?.data === hoje) {
    velas[velas.length - 1] = { ...ultimo, fechamento: c.preco, maxima: Math.max(ultimo.maxima, c.preco), minima: Math.min(ultimo.minima, c.preco) };
  }
  const niveis = niveisDePreco(velas, c.preco);
  const pivos = pivosMensais(velas, c.preco);
  const formatar = (v: number) => (indice ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts` : formatarPreco(v));
  const leituras = leiturasEducativas(velas, niveis, c.preco, formatar);
  const periodoTexto = { "3mo": "3 meses", "6mo": "6 meses", "1y": "12 meses", "2y": "2 anos", "5y": "5 anos" }[PERIODO_ANALISE] ?? PERIODO_ANALISE;

  const estatisticas: [string, string][] = [
    ["Abertura", formatarPreco(c.abertura)],
    ["Fechamento anterior", formatarPreco(c.fechamentoAnterior)],
    ["Máxima do dia", formatarPreco(c.maxDia)],
    ["Mínima do dia", formatarPreco(c.minDia)],
    ["Máxima em 52 semanas", formatarPreco(c.max52)],
    ["Mínima em 52 semanas", formatarPreco(c.min52)],
    ["Volume (ações)", formatarCompacto(c.volume)],
    ["Valor de mercado", c.valorMercado ? `R$ ${formatarCompacto(c.valorMercado)}` : "—"],
    ["P/L", c.pl ? c.pl.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"],
    ["LPA", formatarPreco(c.lpa)],
  ];

  // Posição do preço atual entre a mínima e a máxima de 52 semanas.
  const faixa52 = c.min52 !== null && c.max52 !== null && c.max52 > c.min52 ? ((c.preco - c.min52) / (c.max52 - c.min52)) * 100 : null;

  return (
    <article className="flex flex-col gap-6">
      <Link href="/mercado" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Mercado
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <LogoAtivo simbolo={simbolo} logo={c.logo} tamanho={56} />
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">{simbolo}</h1>
            <p className="truncate text-sm text-suave">{c.nome}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="lg:text-right">
            <p className="font-display text-3xl font-bold tabular-nums text-texto lg:text-4xl">{formatar(c.preco)}</p>
            <p className="mt-1 flex items-center gap-2 lg:justify-end">
              <SeloVariacao valor={c.variacaoPct} grande />
              <span className={`text-sm font-medium tabular-nums ${c.variacao >= 0 ? "text-menta" : "text-erro"}`}>
                {c.variacao >= 0 ? "+" : ""}
                {indice ? c.variacao.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : formatarPreco(c.variacao)} hoje
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/mercado/comparar?s=${encodeURIComponent(simbolo)}`}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-linha bg-superficie px-3 text-sm font-medium text-texto hover:border-violeta"
            >
              <GitCompareArrows className="h-4 w-4 text-ciano" aria-hidden="true" />
              <span className="hidden sm:inline">Comparar</span>
            </Link>
            <BotaoAtualizar simbolo={simbolo} horario={c.horario} />
          </div>
        </div>
      </header>

      {velas.length >= 10 ? (
        <PainelTecnico simbolo={simbolo} indice={indice} candles={velas} niveis={niveis} pivos={pivos} leituras={leituras} periodoAnalise={periodoTexto} />
      ) : (
        <Cartao>
          <p className="text-sm text-suave">Histórico insuficiente para o gráfico deste ativo.</p>
        </Cartao>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Números do dia" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {estatisticas.map(([rotulo, valor]) => (
            <div key={rotulo} className="border-b border-linha pb-2">
              <dt className="text-xs text-suave">{rotulo}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-texto">{valor}</dd>
            </div>
          ))}
        </dl>
        {faixa52 !== null ? (
          <div>
            <p className="text-xs text-suave">Preço atual entre a mínima e a máxima de 52 semanas</p>
            <div className="relative mt-2 h-2 rounded-full bg-superficie-2">
              <span className="gradiente-marca absolute inset-y-0 left-0 rounded-full" style={{ width: `${faixa52}%` }} />
              <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fundo bg-texto" style={{ left: `${faixa52}%` }} aria-hidden="true" />
            </div>
            <div className="mt-1 flex justify-between text-xs tabular-nums text-suave">
              <span>{formatarPreco(c.min52)}</span>
              <span>{formatarPreco(c.max52)}</span>
            </div>
          </div>
        ) : null}
      </Cartao>

      {perfil ? (
        <Cartao className="flex flex-col gap-3">
          <TituloSecao titulo="Sobre a empresa" subtitulo={[perfil.setor, perfil.industria].filter(Boolean).join(" · ") || undefined} />
          {perfil.descricao ? <p className="line-clamp-6 text-sm leading-relaxed text-suave">{perfil.descricao}</p> : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {perfil.cidade ? <span className="text-suave">{perfil.cidade}</span> : null}
            {perfil.site ? (
              <a href={perfil.site} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-ciano">
                Site da empresa <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </Cartao>
      ) : null}

      {classe ? (
        <Link href={`/aprender/${classe}`} className="borda-gradiente flex items-center gap-4 rounded-2xl p-5">
          <GraduationCap className="h-8 w-8 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-xs text-suave">Entenda o tipo de investimento</span>
            <span className="block font-display font-semibold text-texto">Como funcionam {CLASSES[classe].nome.toLowerCase()}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-suave" aria-hidden="true" />
        </Link>
      ) : null}

      </div>

      <AvisoEducacional extra={`${AVISO_MERCADO} Rentabilidade passada não garante resultado futuro.`} />
    </article>
  );
}
