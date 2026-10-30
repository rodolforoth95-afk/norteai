import Link from "next/link";
import { ArrowRight, Coins, Info, PieChart, RefreshCw, TrendingDown, TrendingUp, TriangleAlert, Upload } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { BotaoLink } from "@/components/Botao";
import { Cartao, TituloSecao } from "@/components/ui";
import { CLASSES, ORDEM_CLASSES } from "@/lib/dominio/catalogo";
import {
  calcularAderencia,
  composicaoPrincipal,
  fechamentosMensais,
  formatarPct,
  formatarReais,
  formatarVariacao,
  marcosDeEvolucao,
  percentuais,
  pontosDeAtencao,
  totalPorClasse,
  variacao,
} from "@/lib/dominio/motor";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { BotaoExemplo } from "./BotaoExemplo";
import { BotaoCotacoes } from "./BotaoCotacoes";
import { GraficoComposicao, GraficoEvolucao } from "./Graficos";

const ORIGENS: Record<string, string> = {
  b3: "importada da B3",
  pdf: "importada de PDF",
  planilha: "importada de planilha",
  manual: "manual",
  exemplo: "carteira de exemplo",
};

// Tela 8 — Dashboard da carteira
export default async function PaginaCarteira({ searchParams }: { searchParams: Promise<{ ganhos?: string }> }) {
  const { uid, repo, teste } = await exigirUsuario();
  const { ganhos } = await searchParams;
  const [carteira, perfil, snapshots, moedas] = await Promise.all([
    repo.obterCarteira(uid),
    repo.obterPerfil(uid),
    repo.listarSnapshots(uid),
    repo.listarMoedas(uid),
  ]);
  const mesesPremiados = new Set(moedas.filter((m) => m.tipo === "mes_positivo").map((m) => m.referencia));

  if (!carteira || carteira.posicoes.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-texto">Carteira</h1>
        <div className="borda-gradiente flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center">
          <span className="gradiente-marca flex h-16 w-16 items-center justify-center rounded-2xl">
            <PieChart className="h-8 w-8 text-white" aria-hidden="true" />
          </span>
          <p className="font-display text-xl font-semibold text-texto">Seu mapa de investimentos começa aqui</p>
          <p className="text-sm text-suave">Envie o PDF do extrato, a planilha da B3 ou digite seus investimentos. Você vê a composição, a aderência ao seu estilo e a evolução mês a mês.</p>
          <BotaoLink href="/carteira/importar" larguraTotal>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Importar minha carteira
          </BotaoLink>
          {teste ? <BotaoExemplo /> : null}
        </div>
        <AvisoEducacional />
      </section>
    );
  }

  const porClasse = totalPorClasse(carteira.posicoes);
  const { pct } = percentuais(porClasse);
  const comp = composicaoPrincipal(porClasse);
  const aderencia = perfil ? calcularAderencia(pct, perfil.estilo) : null;
  const pontos = pontosDeAtencao(carteira.posicoes, perfil);
  const marcos = marcosDeEvolucao(snapshots);
  const meses = fechamentosMensais(snapshots);
  const mesAMes = meses.map((m, i) => ({ ...m, var: i > 0 ? variacao(meses[i - 1].total, m.total) : null }));
  const atualizada = new Date(carteira.atualizada_em).toLocaleDateString("pt-BR");
  const ultimoMarco = marcos[marcos.length - 1];

  const fatias = [
    { nome: "Renda fixa", valor: comp.valores.renda_fixa, pct: comp.pct.renda_fixa, cor: "#22C55E" },
    { nome: "Renda variável", valor: comp.valores.renda_variavel, pct: comp.pct.renda_variavel, cor: "#FF8F00" },
    { nome: "Cripto", valor: comp.valores.cripto, pct: comp.pct.cripto, cor: "#FFE08A" },
  ];

  return (
    <section className="flex flex-col gap-7">
      <h1 className="font-display text-2xl font-bold text-texto">Carteira</h1>

      {ganhos ? (
        <p className="flex items-center gap-2 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm font-medium text-ambar" role="status">
          <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
          {ganhos}
        </p>
      ) : null}

      {/* Patrimônio */}
      <div data-tema="escuro" className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #141414 0%, #2A1606 55%, #6B2E00 100%)" }}>
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 animate-brilho rounded-full bg-indigo/40 blur-3xl" aria-hidden="true" />
        <p className="relative text-sm text-white/75">Patrimônio total</p>
        <p className="relative mt-1 font-display text-4xl font-bold">{formatarReais(comp.total)}</p>
        {ultimoMarco?.variacao != null ? (
          <p className={`relative mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${ultimoMarco.variacao >= 0 ? "bg-menta/20 text-menta" : "bg-erro/20 text-erro"}`}>
            {ultimoMarco.variacao >= 0 ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
            {formatarVariacao(ultimoMarco.variacao)} desde o início
          </p>
        ) : null}
        <p className="relative mt-3 text-xs text-white/70">
          Atualizada em {atualizada} · {ORIGENS[carteira.origem] ?? carteira.origem}
        </p>
      </div>

      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {/* Composição principal */}
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Composição" />
        <div className="flex items-center gap-4">
          <GraficoComposicao fatias={fatias} />
          <ul className="flex flex-1 flex-col gap-3">
            {fatias.map((f) => (
              <li key={f.nome}>
                <p className="flex items-center gap-2 text-xs text-suave">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} aria-hidden="true" />
                  {f.nome}
                </p>
                <p className="font-display text-lg font-bold text-texto">{f.pct}%</p>
                <p className="text-xs text-suave">{formatarReais(f.valor)}</p>
              </li>
            ))}
          </ul>
        </div>
      </Cartao>

      {/* Aderência */}
      {aderencia && perfil ? (
        <Cartao className="flex flex-col gap-5">
          <TituloSecao titulo="Aderência ao seu estilo" subtitulo={`Referência: estilo ${perfil.estilo}`} />
          <div className="flex items-center gap-5">
            <Anel valor={aderencia.aderencia} />
            <p className="flex-1 text-sm leading-relaxed text-texto">{aderencia.leitura}</p>
          </div>
          <details className="rounded-2xl bg-superficie-2 px-4 py-3 text-sm">
            <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-medium text-ciano">
              <Info className="h-4 w-4" aria-hidden="true" />
              Como calculamos
            </summary>
            <p className="mt-2 text-suave">Somamos quantos pontos percentuais cada classe está fora da faixa de referência e subtraímos de 100.</p>
          </details>

          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-texto">Sua carteira × referência</p>
            {aderencia.linhas
              .filter((l) => l.atual > 0 || l.max > 0)
              .map((l) => (
                <div key={l.classe}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-texto">{CLASSES[l.classe].nome}</span>
                    <span className="font-medium text-texto">{formatarPct(l.atual)}</span>
                  </div>
                  <div className="relative mt-1.5 h-3 rounded-full bg-superficie-2">
                    <span className="absolute h-3 rounded-full bg-white/15" style={{ left: `${l.min}%`, width: `${Math.max(1, l.max - l.min)}%` }} aria-hidden="true" />
                    <span className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${Math.min(100, l.atual)}%`, background: CLASSES[l.classe].cor }} aria-hidden="true" />
                  </div>
                  <p className={`mt-1 text-xs ${l.status === "Dentro da faixa" ? "text-menta" : "text-ambar"}`}>
                    {l.status} · referência {l.min === l.max ? `${l.max}%` : `${l.min}% a ${l.max}%`}
                  </p>
                </div>
              ))}
          </div>
        </Cartao>
      ) : (
        <Cartao>
          <p className="text-sm text-suave">Faça a entrevista para comparar sua carteira com a referência do seu estilo.</p>
          <Link href="/entrevista" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-ciano">
            Fazer entrevista <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Cartao>
      )}

      {/* Evolução */}
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Evolução" subtitulo="Quanto sua carteira mudou desde que você começou" />
        {meses.length >= 2 ? <GraficoEvolucao pontos={meses} /> : null}
        {marcos.length >= 2 ? (
          <ul className="grid grid-cols-2 gap-2">
            {marcos.map((m) => (
              <li key={m.rotulo} className="rounded-2xl bg-superficie-2 px-3 py-3">
                <p className="text-xs text-suave">{m.rotulo}</p>
                <p className="font-display text-base font-bold text-texto">{formatarReais(m.total, true)}</p>
                <p className={`text-xs font-medium ${m.variacao === null ? "text-suave" : m.variacao >= 0 ? "text-menta" : "text-erro"}`}>
                  {m.variacao === null ? new Date(m.data).toLocaleDateString("pt-BR") : formatarVariacao(m.variacao)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">Atualize sua carteira todo mês para acompanhar a evolução. A cada mês positivo você ganha +100 coins.</p>
        )}
        {mesAMes.length >= 2 ? (
          <ul className="flex flex-col divide-y divide-linha text-sm">
            {mesAMes.slice(1).reverse().map((m) => (
              <li key={m.mes} className="flex items-center justify-between py-2">
                <span className="text-suave">{new Date(`${m.mes}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                <span className={`flex items-center gap-2 font-medium ${m.var !== null && m.var >= 0 ? "text-menta" : "text-erro"}`}>
                  {formatarVariacao(m.var)}
                  {mesesPremiados.has(m.mes) ? <Coins className="h-4 w-4 text-ambar" aria-label="Mês positivo: +100 coins" /> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-suave">A variação inclui novos aportes e resgates, não só o rendimento.</p>
      </Cartao>

      {/* Pontos de atenção */}
      {pontos.length ? (
        <div className="flex flex-col gap-3">
          <TituloSecao titulo="Pontos de atenção" />
          {pontos.map((p) => (
            <Link key={p.texto} href={p.link} className="flex items-start gap-3 rounded-2xl border border-ambar/40 bg-ambar/5 px-4 py-3 text-sm text-texto hover:border-ambar">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ambar" aria-hidden="true" />
              <span className="flex-1">{p.texto}</span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-suave" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}

      {/* Mapa de investimentos */}
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Mapa dos seus investimentos" subtitulo={`${carteira.posicoes.length} investimentos`} />
        {ORDEM_CLASSES.filter((c) => porClasse[c] > 0).map((c) => (
          <div key={c}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-texto">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASSES[c].cor }} aria-hidden="true" />
                {CLASSES[c].nome}
              </p>
              <p className="text-sm text-suave">{formatarPct(pct[c])}</p>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {carteira.posicoes
                .filter((p) => p.classe === c)
                .sort((a, b) => b.valor_atual - a.valor_atual)
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-superficie-2 px-3 py-2 text-sm">
                    <span className="text-texto">
                      {/^[A-Z]{4}\d{1,2}$/.test(p.codigo_ou_nome) ? (
                        <Link href={`/mercado/${p.codigo_ou_nome}`} className="font-semibold underline decoration-linha underline-offset-4 hover:text-ciano">
                          {p.codigo_ou_nome}
                        </Link>
                      ) : (
                        p.codigo_ou_nome
                      )}
                      {p.quantidade ? <span className="ml-1 text-xs text-suave">· {p.quantidade.toLocaleString("pt-BR")} un.</span> : null}
                    </span>
                    <span className="font-medium text-texto">{formatarReais(p.valor_atual)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </Cartao>

      </div>

      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
        <BotaoCotacoes />
        <BotaoLink href="/carteira/importar" variante="secundario" larguraTotal>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Atualizar carteira
        </BotaoLink>
        <BotaoLink href="/aprender/diversificacao" variante="secundario" larguraTotal>
          Aprender sobre diversificação
        </BotaoLink>
        {teste ? <BotaoExemplo /> : null}
      </div>

      <AvisoEducacional extra="Rentabilidade passada não garante resultado futuro." />
    </section>
  );
}

function Anel({ valor }: { valor: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Aderência de ${valor}%`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anel-aderencia" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFB800" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" className="stroke-superficie-2" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#anel-aderencia)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - valor / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold text-texto">{valor}%</span>
    </div>
  );
}
