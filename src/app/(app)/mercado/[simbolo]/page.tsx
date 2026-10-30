import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, GraduationCap } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Cartao, TituloSecao } from "@/components/ui";
import { AVISO_MERCADO, LogoAtivo, SeloVariacao, formatarCompacto, formatarPreco } from "@/components/mercado";
import { CLASSES } from "@/lib/dominio/catalogo";
import { classificar } from "@/lib/dominio/classificar";
import { cotacao, historico, perfilEmpresa } from "@/lib/servidor/brapi";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { GraficoAtivo } from "./GraficoAtivo";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";

export default async function PaginaAtivo({ params }: { params: Promise<{ simbolo: string }> }) {
  await exigirUsuario();
  const simbolo = decodeURIComponent((await params).simbolo).toUpperCase();
  if (!/^\^?[A-Z0-9]{3,12}$/.test(simbolo)) notFound();

  const c = await cotacao(simbolo).catch(() => null);
  if (!c) notFound();
  const [pontos, perfil] = await Promise.all([historico(simbolo, "1mo").catch(() => []), simbolo.startsWith("^") ? null : perfilEmpresa(simbolo)]);
  const classe = simbolo.startsWith("^") ? null : classificar(simbolo);
  // O histórico e a cotação atualizam em momentos diferentes: o ponto de hoje usa a cotação atual.
  const hoje = new Date().toISOString().slice(0, 10);
  if (pontos.at(-1)?.data === hoje) pontos[pontos.length - 1] = { data: hoje, fechamento: c.preco };

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

      <header className="flex items-center gap-4">
        <LogoAtivo simbolo={simbolo} logo={c.logo} tamanho={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-texto">{simbolo}</h1>
          <p className="truncate text-sm text-suave">{c.nome}</p>
        </div>
      </header>
      <div className="-mt-2 flex justify-end">
        <BotaoAtualizar simbolo={simbolo} horario={c.horario} />
      </div>

      <div>
        <p className="font-display text-4xl font-bold tabular-nums text-texto">{formatarPreco(c.preco)}</p>
        <div className="mt-2 flex items-center gap-2">
          <SeloVariacao valor={c.variacaoPct} grande />
          <span className={`text-sm font-medium tabular-nums ${c.variacao >= 0 ? "text-menta" : "text-erro"}`}>
            {c.variacao >= 0 ? "+" : ""}
            {formatarPreco(c.variacao)} hoje
          </span>
        </div>
      </div>

      <GraficoAtivo key={`${c.horario}-${pontos.at(-1)?.fechamento}`} simbolo={simbolo} inicial={pontos} />

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
        <Link href={`/aprender/${classe}`} className="borda-gradiente flex items-center gap-4 rounded-3xl p-5">
          <GraduationCap className="h-8 w-8 shrink-0 text-ciano" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-xs text-suave">Entenda o tipo de investimento</span>
            <span className="block font-display font-semibold text-texto">Como funcionam {CLASSES[classe].nome.toLowerCase()}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-suave" aria-hidden="true" />
        </Link>
      ) : null}

      <AvisoEducacional extra={`${AVISO_MERCADO} Rentabilidade passada não garante resultado futuro.`} />
    </article>
  );
}
