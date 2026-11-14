import { CalendarClock, Flag, PlayCircle, Radar, Sparkles, TrendingUp } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { hojeBR } from "@/lib/dominio/carteira";
import { EVENTOS_RADAR, VIDEOS_RADAR, type EventoRadar } from "@/lib/conteudo/radar";
import { AgendaRadar } from "./AgendaRadar";

export const metadata = { title: "Radar Findomo" };

// Radar Findomo: vídeo de boas-vindas, a semana (expectativas e fechamentos) e os vídeos do módulo.
export default function PaginaRadar() {
  const hoje = hojeBR();
  const boasVindas = VIDEOS_RADAR.find((v) => v.tipo === "boas-vindas") ?? null;
  const outros = VIDEOS_RADAR.filter((v) => v !== boasVindas).sort((a, b) => b.publicado_em.localeCompare(a.publicado_em));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">
            <span className="degrade-ativo flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Radar className="h-5 w-5" aria-hidden="true" />
            </span>
            Radar Findomo
          </h1>
          <p className="mt-1 text-sm text-suave">O que o mercado espera para a semana e o que aconteceu, explicado em poucos minutos.</p>
        </div>
      </header>

      {/* Boas-vindas */}
      <div className="painel grid overflow-hidden p-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative flex aspect-video items-center justify-center lg:aspect-auto lg:h-full lg:min-h-[18rem] bg-[radial-gradient(120%_120%_at_0%_0%,#2D5BFF_0%,#1D2F85_55%,#0B1440_100%)]">
          {boasVindas?.youtubeId ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${boasVindas.youtubeId}`}
              title={boasVindas.titulo}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center text-white">
              <PlayCircle className="h-14 w-14 opacity-90" aria-hidden="true" />
              <p className="font-display text-lg font-semibold">Vídeo de boas-vindas</p>
              <p className="max-w-xs text-sm text-white/75">Em breve: como usar o Radar toda semana para entender o mercado sem ruído.</p>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-4 p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ciano">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Comece por aqui
          </p>
          <h2 className="font-display text-xl font-semibold text-texto">{boasVindas?.titulo ?? "Bem-vindo ao Radar"}</h2>
          <p className="text-sm leading-relaxed text-suave">
            {boasVindas?.descricao ??
              "Toda segunda-feira, a agenda com o que pode mexer com juros, inflação e bolsa. Na sexta, o fechamento: o que saiu acima ou abaixo do esperado e o que isso muda para quem investe."}
          </p>
          <ul className="grid gap-2 text-sm">
            {[
              { Icone: CalendarClock, texto: "Expectativas: o que vai ser divulgado e o que o mercado espera" },
              { Icone: Flag, texto: "Fechamentos: o resultado e a leitura do que mudou" },
              { Icone: TrendingUp, texto: "Vídeos curtos da semana, também no seu Início" },
            ].map(({ Icone, texto }) => (
              <li key={texto} className="flex items-start gap-2.5 text-texto">
                <Icone className="mt-0.5 h-4 w-4 shrink-0 text-ciano" aria-hidden="true" />
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AgendaRadar eventos={EVENTOS_RADAR as EventoRadar[]} hoje={hoje} />

      {/* Vídeos do módulo */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-texto">Vídeos do Radar</h2>
        {outros.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outros.map((v) => (
              <li key={v.slug} className="painel overflow-hidden p-0">
                <div className="relative aspect-video bg-superficie-2">
                  {v.youtubeId ? (
                    <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`} title={v.titulo} allowFullScreen />
                  ) : (
                    <div className="flex h-full items-center justify-center text-suave">
                      <PlayCircle className="h-10 w-10" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ciano">{v.tipo === "fechamento" ? "Fechamento" : v.tipo === "semana" ? "Semana" : "Boas-vindas"}</p>
                  <p className="mt-1 font-semibold text-texto">{v.titulo}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-suave">{v.descricao}</p>
                  <p className="mt-2 text-xs text-suave">
                    {v.publicado_em.split("-").reverse().join("/")} · {v.duracao}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Semana", "Fechamento", "Semana"].map((tipo, i) => (
              <div key={i} className="painel overflow-hidden p-0 opacity-70">
                <div className="flex aspect-video items-center justify-center bg-superficie-2 text-suave">
                  <PlayCircle className="h-10 w-10" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ciano">{tipo}</p>
                  <span className="h-3 w-3/4 rounded bg-superficie-2" />
                  <span className="h-3 w-1/2 rounded bg-superficie-2" />
                  <p className="text-xs text-suave">Novo vídeo em breve</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AvisoEducacional />
    </section>
  );
}
