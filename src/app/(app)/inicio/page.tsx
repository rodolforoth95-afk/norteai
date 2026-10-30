import Link from "next/link";
import { ArrowRight, BookOpen, CandlestickChart, Clapperboard, Coins, FlaskConical, PieChart, Sparkles, Upload, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { SeloVariacao } from "@/components/mercado";
import { MODULOS, progressoModulo } from "@/lib/conteudo/modulos";
import { aulaPorSlug } from "@/lib/conteudo/aulas";
import { VIDEOS } from "@/lib/conteudo/videos";
import { resumoMoedas } from "@/lib/dominio/moedas";
import { formatarReais, formatarVariacao } from "@/lib/dominio/motor";
import { resumoCarteira } from "@/lib/dominio/carteira";
import { INFO_ESTILO } from "@/lib/dominio/catalogo";
import { brapiDisponivel, cotacao } from "@/lib/servidor/brapi";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { MiniGrafico } from "../mercado/MiniGrafico";

// Tela inicial: saldo da carteira, progresso e atalhos para os módulos do app.
export default async function PaginaInicio() {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const [perfil, carteiraDados, moedas, concluidos, entrevista, ibov] = await Promise.all([
    repo.obterPerfil(uid),
    repo.obterCarteira(uid),
    repo.listarMoedas(uid),
    repo.listarConcluidos(uid),
    repo.obterEntrevista(uid),
    brapiDisponivel() ? cotacao("^BVSP").catch(() => null) : Promise.resolve(null),
  ]);

  const resumo = carteiraDados?.investimentos.length ? resumoCarteira(carteiraDados) : null;
  const carteira = resumo && resumo.quantidade > 0 ? resumo : null;
  const total = carteira?.patrimonio ?? 0;
  const variacaoTotal = carteira?.rentabilidadeAcumulada ?? null;
  const meses = (carteira?.serie ?? []).map((m) => ({ data: m.mes, fechamento: m.saldo }));

  const moedasResumo = resumoMoedas(moedas);
  const progressoTrilhas = MODULOS.map((m) => ({ m, ...progressoModulo(m, concluidos) }));
  const totalAulas = MODULOS.reduce((s, m) => s + m.aulas.length, 0);
  const aulasLidas = progressoTrilhas.reduce((s, p) => s + p.lidas, 0);
  const quizzes = progressoTrilhas.filter((p) => p.quiz).length;
  const videosLivres = VIDEOS.filter((v) => !v.custo);
  const videosVistos = videosLivres.filter((v) => concluidos.includes(`video:${v.slug}`)).length;

  // Jornada: entrevista, primeira carteira, aulas, quizzes e vídeos.
  const etapas = 2 + totalAulas + MODULOS.length + videosLivres.length;
  const feitas = (entrevista?.concluida ? 1 : 0) + (carteira ? 1 : 0) + aulasLidas + quizzes + videosVistos;
  const jornada = Math.round((feitas / etapas) * 100);

  const proximaTrilha = progressoTrilhas.find((p) => p.pct < 100);
  const proximaAula = proximaTrilha ? proximaTrilha.m.aulas.find((a) => !concluidos.includes(`leitura:${a}`)) : undefined;
  const proximo = !perfil
    ? { rotulo: "Comece pela entrevista", detalhe: "9 perguntas para conhecer seu estilo · +50 coins", href: "/entrevista" }
    : !carteira
      ? { rotulo: "Cadastre sua carteira", detalhe: "Extrato em PDF, planilha, foto ou digitando · +50 coins", href: "/carteira/importar" }
      : proximaAula
        ? { rotulo: `Continue: ${aulaPorSlug(proximaAula)?.titulo}`, detalhe: `Trilha ${proximaTrilha!.m.titulo}`, href: `/aprender/${proximaAula}` }
        : proximaTrilha
          ? { rotulo: `Faça o quiz de ${proximaTrilha.m.titulo}`, detalhe: "+30 coins", href: `/aprender/modulo/${proximaTrilha.m.slug}` }
          : { rotulo: "Acompanhe o mercado", detalhe: "Cotações, altas e baixas do dia", href: "/mercado" };

  const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const hoje = data.charAt(0).toUpperCase() + data.slice(1);

  return (
    <section className="flex flex-col gap-6">
      <div className="animate-subir">
        <p className="text-sm text-suave">{hoje}</p>
        <h1 className="font-display text-3xl font-bold text-texto lg:text-4xl">Olá{primeiroNome ? `, ${primeiroNome}` : ""}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Patrimônio */}
      {carteira ? (
        <Link data-tema="escuro" href="/carteira" className="relative block h-full animate-subir overflow-hidden rounded-3xl border border-linha p-5 lg:p-7" style={{ background: "linear-gradient(140deg, #121212 0%, #1E1104 60%, #4A2000 100%)" }}>
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-indigo/30 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ciano">Patrimônio investido</p>
            <ArrowRight className="h-5 w-5 text-suave" aria-hidden="true" />
          </div>
          <p className="relative mt-2 font-display text-4xl font-bold tabular-nums text-texto">{formatarReais(total)}</p>
          <div className="relative mt-2 flex items-center gap-2">
            <SeloVariacao valor={variacaoTotal} />
            <span className="text-xs text-suave">{variacaoTotal === null ? "atualize todo mês para ver a evolução" : `de rentabilidade acumulada (${formatarVariacao(variacaoTotal)})`}</span>
          </div>
          {meses.length > 1 ? <MiniGrafico pontos={meses} /> : null}
        </Link>
      ) : (
        <Link href={perfil ? "/carteira/importar" : "/entrevista"} className="borda-gradiente relative block animate-subir overflow-hidden rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ciano">Patrimônio investido</p>
          <p className="mt-2 font-display text-4xl font-bold text-texto">R$ —</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-suave">
            {perfil ? <Upload className="h-4 w-4 text-ciano" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-ciano" aria-hidden="true" />}
            {perfil ? "Importe sua carteira para acompanhar saldo e evolução" : "Faça a entrevista e depois importe sua carteira"}
          </p>
        </Link>
      )}

      {/* Progresso */}
      <div className="rounded-3xl border border-linha bg-superficie p-5">
        <div className="flex items-center gap-4">
          <Anel valor={jornada} />
          <div className="flex-1">
            <p className="text-xs text-suave">Sua jornada</p>
            <p className="font-display text-xl font-bold text-texto">
              Nível {moedasResumo.nivel}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ambar">
              <Coins className="h-4 w-4" aria-hidden="true" />
              {moedasResumo.saldo} coins
              {moedasResumo.proximo ? <span className="text-xs text-suave">· faltam {moedasResumo.proximo.minimo - moedasResumo.ganhas} para {moedasResumo.proximo.nome}</span> : null}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Aulas", `${aulasLidas}/${totalAulas}`],
            ["Quizzes", `${quizzes}/${MODULOS.length}`],
            ["Vídeos", `${videosVistos}/${videosLivres.length}`],
          ].map(([r, v]) => (
            <div key={r} className="rounded-2xl bg-superficie-2 py-2.5">
              <dd className="font-display text-lg font-bold tabular-nums text-texto">{v}</dd>
              <dt className="text-[11px] text-suave">{r}</dt>
            </div>
          ))}
        </dl>
        <Link href={proximo.href} className="mt-4 flex items-center gap-3 rounded-2xl border border-violeta/40 bg-violeta/10 px-4 py-3">
          <span className="flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ciano">Próximo passo</span>
            <span className="block text-sm font-semibold text-texto">{proximo.rotulo}</span>
            <span className="block text-xs text-suave">{proximo.detalhe}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-ciano" aria-hidden="true" />
        </Link>
      </div>

      </div>

      {/* Módulos */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <Modulo href="/mercado" icone={<CandlestickChart className="h-6 w-6" />} titulo="Mercado" detalhe={ibov ? <>Ibovespa <SeloVariacao valor={ibov.variacaoPct} /></> : "Cotações e destaques"} />
        <Modulo href="/carteira" icone={<PieChart className="h-6 w-6" />} titulo="Carteira" detalhe={carteira ? `${carteira.quantidade} investimentos` : "Adicionar"} />
        <Modulo href="/aprender" icone={<BookOpen className="h-6 w-6" />} titulo="Trilhas" detalhe={`${Math.round((aulasLidas / totalAulas) * 100)}% concluído`} />
        <Modulo href="/perfil" icone={<UserRound className="h-6 w-6" />} titulo="Meu perfil" detalhe={perfil ? <span className="font-semibold text-ciano">{perfil.estilo} · {INFO_ESTILO[perfil.estilo].risco.toLowerCase()}</span> : "Fazer entrevista"} />
        <Modulo href="/aprender" icone={<Clapperboard className="h-6 w-6" />} titulo="Vídeos" detalhe={`${videosVistos} de ${videosLivres.length} assistidos`} />
        <Modulo href="/simulador" icone={<FlaskConical className="h-6 w-6" />} titulo="Simulador" detalhe="3 carteiras de exemplo" />
      </div>

      <AvisoEducacional />
    </section>
  );
}

function Modulo({ href, icone, titulo, detalhe }: { href: string; icone: ReactNode; titulo: string; detalhe: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-28 flex-col justify-between rounded-3xl border border-linha bg-superficie p-4 transition hover:border-violeta">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-superficie-2 text-ciano" aria-hidden="true">
        {icone}
      </span>
      <span>
        <span className="block font-display text-base font-semibold text-texto">{titulo}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-suave">{detalhe}</span>
      </span>
    </Link>
  );
}

function Anel({ valor }: { valor: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`Jornada ${valor}% concluída`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anel-jornada" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFB800" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" className="stroke-superficie-2" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="url(#anel-jornada)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - valor / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-texto">{valor}%</span>
    </div>
  );
}
