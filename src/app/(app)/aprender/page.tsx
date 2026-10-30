import Link from "next/link";
import { ChevronRight, Coins, Trophy } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { GaleriaVideos } from "@/components/GaleriaVideos";
import { IconeModulo } from "@/components/IconeModulo";
import { Cartao, TituloSecao } from "@/components/ui";
import { MODULOS, progressoModulo } from "@/lib/conteudo/modulos";
import { VIDEOS } from "@/lib/conteudo/videos";
import { RECOMPENSAS, resumoMoedas, rotuloLancamento } from "@/lib/dominio/moedas";
import { exigirUsuario } from "@/lib/servidor/sessao";

export default async function PaginaAprender() {
  const { uid, repo } = await exigirUsuario();
  const [moedas, concluidos] = await Promise.all([repo.listarMoedas(uid), repo.listarConcluidos(uid)]);
  const resumo = resumoMoedas(moedas);
  const desbloqueados = moedas.filter((m) => m.tipo === "desbloqueio").map((m) => m.referencia);
  const livres = VIDEOS.filter((v) => !v.custo);
  const exclusivos = VIDEOS.filter((v) => v.custo);

  const progresso = MODULOS.map((m) => ({ m, ...progressoModulo(m, concluidos) }));
  const totalAulas = MODULOS.reduce((s, m) => s + m.aulas.length, 0);
  const aulasLidas = progresso.reduce((s, p) => s + p.lidas, 0);

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-texto">Aprender</h1>
        <p className="mt-1 text-sm text-suave">
          {aulasLidas} de {totalAulas} aulas concluídas em {MODULOS.length} trilhas
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-superficie-2">
          <div className="gradiente-marca h-full rounded-full" style={{ width: `${(aulasLidas / totalAulas) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TituloSecao titulo="Trilhas" subtitulo={`+${RECOMPENSAS.leitura.valor} coins por aula · +${RECOMPENSAS.quiz.valor} por quiz`} />
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {progresso.map(({ m, lidas, quiz, pct }, i) => (
            <li key={m.slug} className="min-w-0">
              <Link href={`/aprender/modulo/${m.slug}`} className="flex min-w-0 items-center gap-4 rounded-3xl border border-linha bg-superficie p-4 transition hover:border-violeta">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-superficie-2 text-ciano">
                  <IconeModulo icone={m.icone} className="h-7 w-7" />
                  <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-fundo font-display text-xs font-bold text-suave ring-1 ring-linha">
                    {i + 1}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold text-texto">{m.titulo}</span>
                  <span className="block truncate text-xs text-suave">{m.descricao}</span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
                      <span className="gradiente-marca block h-full rounded-full" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-[11px] tabular-nums text-suave">
                      {lidas}/{m.aulas.length}
                      {quiz ? " · quiz ✓" : ""}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <TituloSecao titulo="Vídeos de 1 minuto" subtitulo={`+${RECOMPENSAS.video.valor} coins por vídeo assistido até o fim`} />
        <GaleriaVideos videos={livres} concluidos={concluidos} desbloqueados={desbloqueados} saldo={resumo.saldo} />
      </div>

      <div id="coins" className="flex scroll-mt-24 flex-col gap-3">
        <TituloSecao titulo="Treinamentos exclusivos" subtitulo="Desbloqueie com suas coins" />
        <GaleriaVideos videos={exclusivos} concluidos={concluidos} desbloqueados={desbloqueados} saldo={resumo.saldo} formato="grade" />
      </div>

      <Cartao className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span className="gradiente-marca flex h-14 w-14 items-center justify-center rounded-2xl">
            <Trophy className="h-7 w-7 text-black" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-suave">Seu nível</p>
            <p className="font-display text-xl font-bold text-texto">{resumo.nivel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-suave">Saldo</p>
            <p className="flex items-center gap-1 font-display text-xl font-bold text-ambar">
              <Coins className="h-5 w-5" aria-hidden="true" />
              {resumo.saldo}
            </p>
          </div>
        </div>
        {resumo.proximo ? (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-superficie-2">
              <div className="gradiente-marca h-full rounded-full" style={{ width: `${resumo.progresso * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-suave">
              {resumo.proximo.minimo - resumo.ganhas} coins ganhas para chegar a {resumo.proximo.nome}
            </p>
          </div>
        ) : (
          <p className="text-sm text-menta">Você chegou ao nível máximo.</p>
        )}
        <div>
          <p className="text-sm font-semibold text-texto">Como ganhar coins</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {Object.entries(RECOMPENSAS).map(([chave, r]) => (
              <li key={chave} className="flex justify-between">
                <span className="text-suave">{r.rotulo}</span>
                <span className="font-bold text-ambar">+{r.valor}</span>
              </li>
            ))}
          </ul>
        </div>
        {moedas.length ? (
          <div>
            <p className="text-sm font-semibold text-texto">Histórico</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {[...moedas].reverse().slice(0, 6).map((m) => (
                <li key={`${m.tipo}-${m.referencia}`} className="flex justify-between">
                  <span className="text-suave">{rotuloLancamento(m)}</span>
                  <span className={m.valor > 0 ? "font-bold text-menta" : "font-bold text-erro"}>{m.valor > 0 ? `+${m.valor}` : m.valor}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Cartao>

      <AvisoEducacional />
    </section>
  );
}
