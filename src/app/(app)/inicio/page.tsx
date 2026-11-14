import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Clock, FileText, Keyboard, PiggyBank, PlayCircle, Plus, Radar, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { Mascote } from "@/components/Logo";
import { MODULOS, progressoModulo } from "@/lib/conteudo/modulos";
import { aulaPorSlug } from "@/lib/conteudo/aulas";
import { VIDEOS } from "@/lib/conteudo/videos";
import { alvoDoMes, rendaGuardadaAtual, resumoDoMes, somarMeses } from "@/lib/dominio/financas";
import { videosRecentes } from "@/lib/conteudo/radar";
import { carregarFinancas } from "@/lib/servidor/financas";
import { DIAS_DESATUALIZADO, formatarData, hojeBR, resumoCarteira } from "@/lib/dominio/carteira";
import { FAIXAS, INFO_ESTILO } from "@/lib/dominio/catalogo";
import { brapiDisponivel, cotacao } from "@/lib/servidor/brapi";
import { indicadores } from "@/lib/servidor/indicadores";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { MiniGrafico } from "../mercado/MiniGrafico";

export const metadata = { title: "Início" };

type Tarefa = { id: string; texto: string; detalhe: string; minutos: number; href: string; feito: boolean };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number | null, casas = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const tom = (v: number | null) => (v === null ? "text-suave" : v > 0 ? "text-menta" : v < 0 ? "text-erro" : "text-texto");

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

// Tela inicial: o que mudou no patrimônio, o que falta fazer hoje e o mercado do dia.
export default async function PaginaInicio() {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const [perfil, carteiraDados, moedas, concluidos, ibov, ind, financas] = await Promise.all([
    repo.obterPerfil(uid),
    repo.obterCarteira(uid),
    repo.listarMoedas(uid),
    repo.listarConcluidos(uid),
    brapiDisponivel() ? cotacao("^BVSP").catch(() => null) : Promise.resolve(null),
    indicadores().catch(() => null),
    carregarFinancas(repo, uid).catch(() => null),
  ]);

  const hoje = hojeBR();
  const resumo = carteiraDados?.investimentos.length ? resumoCarteira(carteiraDados, hoje) : null;
  const carteira = resumo && resumo.quantidade > 0 ? resumo : null;
  const ultimoRegistro = carteira ? carteira.linhas.map((l) => l.ultimaData ?? "").sort().at(-1) || null : null;
  const nomeMes = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { month: "long" });

  // Quanto da renda a pessoa está guardando (Finanças).
  const mesAtual = hoje.slice(0, 7);
  const guardar = financas?.lancamentos.length
    ? (() => {
        const mes = resumoDoMes(financas, mesAtual);
        const anterior = resumoDoMes(financas, somarMeses(mesAtual, -1));
        const media = rendaGuardadaAtual(financas, mesAtual);
        const pctMes = mes.receitas > 0 ? Math.round((mes.saldo / mes.receitas) * 100) : null;
        const pctAnterior = anterior.receitas > 0 ? Math.round((anterior.saldo / anterior.receitas) * 100) : null;
        const alvo = financas.metaGuardar ? alvoDoMes(financas.metaGuardar, mesAtual) : null;
        return { mes, media, pctMes, pctAnterior, alvo, alvoFinal: financas.metaGuardar?.alvoPct ?? null };
      })()
    : null;
  const radar = videosRecentes(3);
  const trilhas = MODULOS.map((m) => ({ m, ...progressoModulo(m, concluidos) }));
  const totalAulas = MODULOS.reduce((s, m) => s + m.aulas.length, 0);
  const aulasLidas = trilhas.reduce((s, t) => s + t.lidas, 0);
  const quizzes = trilhas.filter((t) => t.quiz).length;
  const videosLivres = VIDEOS.filter((v) => !v.custo);
  const videosVistos = videosLivres.filter((v) => concluidos.includes(`video:${v.slug}`)).length;
  const emAndamento = trilhas.find((t) => t.pct > 0 && t.pct < 100) ?? trilhas.find((t) => t.pct < 100);
  const proximaAulaSlug = emAndamento?.m.aulas.find((a) => !concluidos.includes(`leitura:${a}`));
  const proximaAula = proximaAulaSlug ? aulaPorSlug(proximaAulaSlug) : null;
  const quizPendente = trilhas.find((t) => t.lidas === t.m.aulas.length && !t.quiz);
  const simulou = moedas.some((m) => m.tipo === "simulacao");

  // Tarefas calculadas a partir dos dados de quem está usando.
  const tarefas: Tarefa[] = [
    {
      id: "perfil",
      texto: "Responder as 9 perguntas do perfil de investidor",
      detalhe: "Define as faixas usadas no simulador e na análise da sua carteira.",
      minutos: 3,
      href: "/entrevista",
      feito: Boolean(perfil),
    },
    {
      id: "carteira",
      texto: "Cadastrar seus investimentos",
      detalhe: "Pelo extrato da B3, PDF, print da corretora ou digitando.",
      minutos: 3,
      href: "/carteira/importar",
      feito: Boolean(carteira),
    },
  ];
  if (carteira) {
    const desatualizados = carteira.desatualizados;
    const registrouNoMes = Boolean(ultimoRegistro && ultimoRegistro.slice(0, 7) === hoje.slice(0, 7));
    tarefas.push(
      desatualizados.length
        ? {
            id: "saldos",
            texto: `Atualizar o saldo de ${desatualizados.length} ${desatualizados.length === 1 ? "investimento" : "investimentos"}`,
            detalhe: `Sem registro há mais de ${DIAS_DESATUALIZADO} dias: ${desatualizados.slice(0, 3).map((l) => l.inv.nome).join(", ")}${desatualizados.length > 3 ? "…" : ""}.`,
            minutos: 2,
            href: "/carteira/importar",
            feito: false,
          }
        : {
            id: "saldos",
            texto: `Registrar os saldos de ${nomeMes}`,
            detalhe: registrouNoMes ? `Feito em ${formatarData(ultimoRegistro!)}.` : "Separa o rendimento do mês do dinheiro que você aplicou.",
            minutos: 2,
            href: "/carteira/importar",
            feito: registrouNoMes,
          },
    );
  }
  if (quizPendente) {
    tarefas.push({
      id: "quiz",
      texto: `Fazer o quiz de ${quizPendente.m.titulo}`,
      detalhe: `Você leu as ${quizPendente.m.aulas.length} aulas da trilha. Acertando, ganha 30 coins.`,
      minutos: 3,
      href: `/aprender/modulo/${quizPendente.m.slug}`,
      feito: false,
    });
  } else if (proximaAula && emAndamento) {
    tarefas.push({
      id: "aula",
      texto: `Ler “${proximaAula.titulo}”`,
      detalhe: `${emAndamento.m.titulo} · aula ${emAndamento.lidas + 1} de ${emAndamento.m.aulas.length}.`,
      minutos: proximaAula.minutos,
      href: `/aprender/${proximaAula.slug}`,
      feito: false,
    });
  }
  tarefas.push({
    id: "simulacao",
    texto: perfil ? `Simular 3 carteiras para o perfil ${perfil.estilo}` : "Simular quanto seu dinheiro pode render",
    detalhe: ind ? `Com a Selic de hoje (${ind.selic.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%) e o aporte que você define.` : "Com os juros de hoje e o aporte que você define.",
    minutos: 2,
    href: "/simulador",
    feito: simulou,
  });

  const pendentes = tarefas.filter((t) => !t.feito);
  const feitas = tarefas.filter((t) => t.feito);
  const tempoPendente = pendentes.reduce((s, t) => s + t.minutos, 0);
  const proxima = pendentes[0];

  const dataLonga = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dataHoje = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);

  return (
    <section className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-suave">{dataHoje}</p>
          <h1 className="mt-1 font-display text-[1.75rem] font-bold leading-tight tracking-[-0.01em] text-texto lg:text-[2.1rem]">
            {saudacao()}
            {primeiroNome ? `, ${primeiroNome}` : ""}.
          </h1>
          <p className="mt-1 text-[15px] text-suave">
            {pendentes.length
              ? `${pendentes.length} ${pendentes.length === 1 ? "tarefa" : "tarefas"} para hoje, cerca de ${tempoPendente} minutos no total.`
              : "Tudo em dia por aqui. Volte quando fizer um aporte ou no fim do mês."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/carteira/importar"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2D5BFF] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(20_33_92/0.2)] hover:bg-[#2450E8]"
          >
            {carteira ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {carteira ? "Atualizar saldos" : "Cadastrar investimentos"}
          </Link>
          <BotaoSecundario href="/simulador">Simular</BotaoSecundario>
          <span className="hidden sm:contents">
            <BotaoSecundario href="/mercado">
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar ativo
            </BotaoSecundario>
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Patrimônio */}
          {carteira ? (
            <Painel>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-suave">Patrimônio</p>
                  <p className="mt-0.5 font-display text-[2.4rem] font-bold leading-none tracking-[-0.02em] tabular-nums text-texto">{brl(carteira.patrimonio)}</p>
                  <p className="mt-2 text-xs text-suave">
                    {carteira.quantidade} investimentos{ultimoRegistro ? ` · último registro em ${formatarData(ultimoRegistro)}` : ""}
                  </p>
                </div>
                {carteira.serie.length > 1 ? (
                  <div className="hidden w-56 sm:block">
                    <MiniGrafico pontos={carteira.serie.map((p) => ({ data: p.mes, fechamento: p.saldo }))} />
                  </div>
                ) : null}
              </div>
              <dl className="mt-5 grid grid-cols-1 divide-y divide-linha border-t border-linha sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:pt-4">
                <Numero rotulo={`Rendimento em ${nomeMes}`} valor={brl(carteira.mes?.rendimento ?? 0)} classe={tom(carteira.mes?.rendimento ?? null)} extra={pct(carteira.mes?.rentabilidade ?? null, 2)} />
                <Numero rotulo="Acumulado" valor={pct(carteira.rentabilidadeAcumulada)} classe={tom(carteira.rentabilidadeAcumulada)} extra={brl(carteira.rendimento)} />
                <Numero rotulo="Aplicado" valor={brl(carteira.aplicado)} classe="text-texto" extra="sem rendimento" />
              </dl>
              <Link href="/carteira" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ciano hover:underline">
                Abrir carteira <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="mt-5 flex flex-col gap-3 border-t border-linha pt-4 xl:flex-row xl:items-center xl:justify-between">
                {perfil ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="degrade-ativo flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs text-suave">Seu perfil de investidor</p>
                        <p className="font-display text-base font-semibold text-texto">
                          {perfil.estilo} <span className="text-sm font-medium text-suave">· {INFO_ESTILO[perfil.estilo].risco.toLowerCase()}</span>
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-suave">
                          Renda fixa entre {FAIXAS[perfil.estilo].renda_fixa.min}% e {FAIXAS[perfil.estilo].renda_fixa.max}%
                          {FAIXAS[perfil.estilo].acoes_etfs.max > 0 ? `, ações e ETFs até ${FAIXAS[perfil.estilo].acoes_etfs.max}%` : ", sem ações"}.
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-4 text-sm font-semibold">
                      <Link href="/perfil" className="text-ciano hover:underline">
                        Ver perfil
                      </Link>
                      <Link href="/simulador" className="text-ciano hover:underline">
                        Carteiras de exemplo
                      </Link>
                    </div>
                  </>
                ) : (
                  <Link href="/entrevista" className="flex items-center gap-3 text-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-ciano">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold text-texto">Descubra seu perfil de investidor</span>
                      <span className="block text-xs text-suave">9 perguntas · 3 min</span>
                    </span>
                  </Link>
                )}
              </div>
            </Painel>
          ) : (
            <Painel>
              <p className="text-sm text-suave">Patrimônio</p>
              <p className="mt-1 font-display text-xl font-semibold text-texto">Nenhum investimento cadastrado ainda</p>
              <p className="mt-1 max-w-lg text-sm text-suave">
                Com a carteira aqui, você vê quanto rendeu no mês sem contar os aportes e compara com o CDI. Escolha o jeito mais rápido para você:
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  { href: "/carteira/importar", Icone: FileText, titulo: "Enviar extrato", texto: "B3, PDF ou print", min: 2 },
                  { href: "/carteira/importar", Icone: Keyboard, titulo: "Digitar saldos", texto: "Uma lista rápida", min: 3 },
                  { href: "/carteira/adicionar", Icone: Plus, titulo: "Um por um", texto: "Com data e valor", min: 1 },
                ].map(({ href, Icone, titulo, texto, min }) => (
                  <Link key={titulo} href={href} className="group flex items-center gap-3 rounded-xl border border-linha px-3.5 py-3 transition hover:border-ciano hover:bg-superficie-2">
                    <Icone className="h-5 w-5 shrink-0 text-ciano" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-texto">{titulo}</span>
                      <span className="block text-xs text-suave">
                        {texto} · {min} min
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-linha pt-4 xl:flex-row xl:items-center xl:justify-between">
                {perfil ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="degrade-ativo flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs text-suave">Seu perfil de investidor</p>
                        <p className="font-display text-base font-semibold text-texto">
                          {perfil.estilo} <span className="text-sm font-medium text-suave">· {INFO_ESTILO[perfil.estilo].risco.toLowerCase()}</span>
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-suave">
                          Renda fixa entre {FAIXAS[perfil.estilo].renda_fixa.min}% e {FAIXAS[perfil.estilo].renda_fixa.max}%
                          {FAIXAS[perfil.estilo].acoes_etfs.max > 0 ? `, ações e ETFs até ${FAIXAS[perfil.estilo].acoes_etfs.max}%` : ", sem ações"}.
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-4 text-sm font-semibold">
                      <Link href="/perfil" className="text-ciano hover:underline">
                        Ver perfil
                      </Link>
                      <Link href="/simulador" className="text-ciano hover:underline">
                        Carteiras de exemplo
                      </Link>
                    </div>
                  </>
                ) : (
                  <Link href="/entrevista" className="flex items-center gap-3 text-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-ciano">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold text-texto">Descubra seu perfil de investidor</span>
                      <span className="block text-xs text-suave">9 perguntas · 3 min</span>
                    </span>
                  </Link>
                )}
              </div>
            </Painel>
          )}

        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {/* Quanto guarda da renda */}
          <Painel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-suave">Quanto você guarda</p>
                <p className="text-xs text-suave">da sua renda mensal</p>
              </div>
              <span className="degrade-ativo flex h-10 w-10 items-center justify-center rounded-xl text-white">
                <PiggyBank className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            {guardar ? (
              <>
                <p className="mt-3 font-display text-[2.6rem] font-bold leading-none tabular-nums tracking-[-0.02em] text-texto">
                  {guardar.pctMes ?? guardar.media}%
                </p>
                <p className="mt-2 text-sm text-suave">
                  {brl(Math.max(0, guardar.mes.saldo))} de {brl(guardar.mes.receitas)} em {nomeMes}
                </p>
                {guardar.alvo !== null ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-suave">
                      <span>Meta do mês: {guardar.alvo}%</span>
                      <span>alvo final {guardar.alvoFinal}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-superficie-2">
                      <div className="degrade-ativo h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, ((guardar.pctMes ?? 0) / Math.max(1, guardar.alvo)) * 100))}%` }} />
                    </div>
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-suave">
                  Média dos últimos meses: <span className="font-semibold text-texto">{guardar.media}%</span>
                  {guardar.pctAnterior !== null ? (
                    <>
                      {" "}· mês passado <span className="font-semibold text-texto">{guardar.pctAnterior}%</span>
                    </>
                  ) : null}
                </p>
                <Link href="/financas" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ciano hover:underline">
                  {guardar.alvo !== null ? "Ver minha meta" : "Criar meta de guardar"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-xl font-semibold text-texto">Ainda sem lançamentos</p>
                <p className="mt-1 text-sm text-suave">Lance receitas e despesas em Finanças e eu mostro quanto da sua renda sobra para investir.</p>
                <Link href="/financas" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ciano hover:underline">
                  Abrir Finanças <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </Painel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Para fazer */}
          <Painel semPadding>
            <div className="flex items-baseline justify-between px-5 pt-5">
              <h2 className="font-display text-[17px] font-semibold text-texto">Para fazer</h2>
              <span className="text-xs tabular-nums text-suave">
                {feitas.length} de {tarefas.length} concluídas
              </span>
            </div>
            <div className="mx-5 mt-3 h-1 overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
              <div className="h-full rounded-full bg-[#2D5BFF]" style={{ width: `${(feitas.length / tarefas.length) * 100}%` }} />
            </div>
            <ul className="mt-3 divide-y divide-linha">
              {[...pendentes, ...feitas].map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className={`group flex items-start gap-3.5 px-5 py-3.5 transition hover:bg-superficie-2/60 ${t.feito ? "opacity-60" : ""}`}>
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] ${t.feito ? "border-[#2D5BFF] bg-[#2D5BFF]" : "border-linha group-hover:border-ciano"}`}
                      aria-hidden="true"
                    >
                      {t.feito ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] font-semibold ${t.feito ? "text-suave line-through decoration-linha" : "text-texto"}`}>{t.texto}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-suave">{t.detalhe}</span>
                    </span>
                    {t.feito ? (
                      <span className="text-xs text-suave">Feito</span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-suave">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.minutos} min
                        <ChevronRight className="h-4 w-4 text-suave transition group-hover:translate-x-0.5 group-hover:text-ciano" aria-hidden="true" />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            {proxima ? (
              <div className="flex items-start gap-3 border-t border-linha bg-superficie-2/50 px-5 py-4">
                <Mascote className="h-8 w-8 shrink-0" />
                <p className="text-[13px] leading-relaxed text-suave">
                  <span className="font-semibold text-texto">Comece por “{proxima.texto.replace(/^\w/, (c) => c.toLowerCase())}”.</span>{" "}
                  {proxima.id === "perfil"
                    ? "Sem o perfil, o simulador e a análise da carteira não têm referência."
                    : proxima.id === "carteira"
                      ? "É o que mais libera recursos no app: rendimento, comparativos e alertas."
                      : proxima.id === "saldos"
                        ? "Atualizar no mesmo dia de cada mês deixa a rentabilidade comparável."
                        : "São poucos minutos e ficam salvos no seu progresso."}
                </p>
              </div>
            ) : null}
          </Painel>

        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <Painel semPadding>
            <div className="flex items-baseline justify-between px-5 pt-5">
              <h2 className="font-display text-[17px] font-semibold text-texto">Mercado agora</h2>
              <Link href="/mercado" className="text-sm font-semibold text-ciano hover:underline">
                Abrir
              </Link>
            </div>
            <dl className="mt-2 divide-y divide-linha text-sm">
              {ibov ? (
                <Linha rotulo="Ibovespa" valor={`${ibov.preco.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts`} extra={<span className={`font-semibold ${tom(ibov.variacaoPct)}`}>{pct(ibov.variacaoPct, 2)}</span>} />
              ) : null}
              {ind ? (
                <>
                  <Linha rotulo="Selic" valor={`${ind.selic.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% a.a.`} extra="meta do BC" />
                  <Linha rotulo="CDI" valor={`${ind.cdi.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% a.a.`} extra={`${(((1 + ind.cdi / 100) ** (1 / 12) - 1) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ao mês`} />
                  <Linha rotulo="Inflação (IPCA)" valor={`${ind.ipca12m.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`} extra="12 meses" />
                </>
              ) : null}
            </dl>
            <p className="px-5 pb-4 pt-2 text-[11px] text-suave">Banco Central e B3, com atraso de até 30 minutos.</p>
          </Painel>

          <Painel semPadding>
            <div className="flex items-baseline justify-between px-5 pt-5">
              <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold text-texto">
                <Radar className="h-4 w-4 text-ciano" aria-hidden="true" /> Radar Findomo
              </h2>
              <Link href="/radar" className="text-sm font-semibold text-ciano hover:underline">
                Abrir
              </Link>
            </div>
            {radar.length ? (
              <ul className="mt-2 divide-y divide-linha">
                {radar.map((v) => (
                  <li key={v.slug}>
                    <Link href="/radar" className="flex items-center gap-3 px-5 py-3 hover:bg-superficie-2/60">
                      <PlayCircle className="h-8 w-8 shrink-0 text-ciano" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-texto">{v.titulo}</span>
                        <span className="block text-xs text-suave">
                          {v.publicado_em.split("-").reverse().slice(0, 2).join("/")} · {v.duracao}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link href="/radar" className="m-5 mt-3 flex items-center gap-3 rounded-xl border border-dashed border-linha p-3.5 hover:border-ciano">
                <PlayCircle className="h-8 w-8 shrink-0 text-ciano" aria-hidden="true" />
                <span className="text-sm">
                  <span className="block font-semibold text-texto">Vídeo de boas-vindas em breve</span>
                  <span className="block text-xs text-suave">Expectativas e fechamentos da semana</span>
                </span>
              </Link>
            )}
          </Painel>
        </aside>
      </div>

      {/* Estudos */}
      <Painel>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-[17px] font-semibold text-texto">Estudos</h2>
            <p className="text-xs text-suave">
              {aulasLidas} de {totalAulas} aulas · {quizzes} de {MODULOS.length} quizzes · {videosVistos} de {videosLivres.length} vídeos
            </p>
          </div>
          <Link href="/aprender" className="text-sm font-semibold text-ciano hover:underline">
            Ver todas as trilhas
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trilhas.map((t) => (
            <li key={t.m.slug}>
              <Link href={`/aprender/modulo/${t.m.slug}`} className="flex h-full flex-col gap-2 rounded-2xl border border-linha p-4 transition hover:border-ciano hover:bg-superficie-2/50">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-texto">{t.m.titulo}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-suave">{t.pct}%</span>
                </span>
                <span className="text-xs text-suave">
                  {t.lidas} de {t.m.aulas.length} aulas{t.quiz ? " · quiz feito" : ""}
                </span>
                <span className="mt-auto h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
                  <span className="degrade-ativo block h-full rounded-full" style={{ width: `${Math.max(2, t.pct)}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Painel>

      <AvisoEducacional />
    </section>
  );
}

function Painel({ children, semPadding = false }: { children: ReactNode; semPadding?: boolean }) {
  return <div className={`painel ${semPadding ? "overflow-hidden" : "p-5"}`}>{children}</div>;
}

function BotaoSecundario({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-linha bg-superficie px-4 text-sm font-semibold text-texto hover:border-ciano">
      {children}
    </Link>
  );
}

// No celular vira uma linha (rótulo à esquerda, valor à direita); a partir do tablet, uma coluna.
function Numero({ rotulo, valor, classe, extra }: { rotulo: string; valor: string; classe: string; extra: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 sm:block sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-sm text-suave sm:truncate sm:text-xs">{rotulo}</dt>
      <dd className="text-right sm:text-left">
        <span className={`block font-display text-base font-semibold tabular-nums sm:mt-0.5 sm:text-lg ${classe}`}>{valor}</span>
        <span className="block text-xs tabular-nums text-suave">{extra}</span>
      </dd>
    </div>
  );
}

function Linha({ rotulo, valor, extra }: { rotulo: string; valor: string; extra: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
      <dt className="text-suave">{rotulo}</dt>
      <dd className="text-right">
        <span className="font-semibold tabular-nums text-texto">{valor}</span>
        <span className="ml-2 text-xs text-suave">{extra}</span>
      </dd>
    </div>
  );
}
