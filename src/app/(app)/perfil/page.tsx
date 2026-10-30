import Link from "next/link";
import { ArrowRight, Flag, Lock, PencilLine, RefreshCw, Sparkles, Upload } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { BotaoLink } from "@/components/Botao";
import { GaleriaVideos } from "@/components/GaleriaVideos";
import { Cartao, SeloRisco, TituloSecao } from "@/components/ui";
import { CLASSES, ESTILOS, FAIXAS, INFO_ESTILO, ORDEM_CLASSES, tiposDoEstilo } from "@/lib/dominio/catalogo";
import { calcularEstilo, primeiroPasso } from "@/lib/dominio/motor";
import { resumoMoedas } from "@/lib/dominio/moedas";
import { videosDasClasses } from "@/lib/conteudo/videos";
import { exigirUsuario } from "@/lib/servidor/sessao";

// Meu perfil: estilo de investidor, tipos de investimento do estilo e faixas de referência
export default async function PaginaPerfil() {
  const { uid, repo } = await exigirUsuario();
  const [perfil, carteira, moedas, concluidos] = await Promise.all([
    repo.obterPerfil(uid),
    repo.obterCarteira(uid),
    repo.listarMoedas(uid),
    repo.listarConcluidos(uid),
  ]);

  if (!perfil) {
    return (
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-texto">Meu perfil</h1>
        <div className="borda-gradiente relative overflow-hidden rounded-3xl p-6">
          <div className="gradiente-marca pointer-events-none absolute -right-12 -top-12 h-40 w-40 animate-brilho rounded-full opacity-40 blur-3xl" aria-hidden="true" />
          <Sparkles className="h-8 w-8 text-ciano" aria-hidden="true" />
          <p className="mt-4 text-sm text-suave">Seu estilo de investidor (educacional)</p>
          <p className="mt-1 font-display text-2xl font-bold text-texto">Descubra em 4 minutos</p>
          <p className="mt-2 text-sm text-suave">9 perguntas rápidas e você recebe seu diagnóstico, os tipos de investimento do seu estilo e +50 coins.</p>
          <div className="mt-5">
            <BotaoLink href="/entrevista">
              Começar entrevista <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </BotaoLink>
          </div>
        </div>
        <AvisoEducacional />
      </section>
    );
  }

  const r = perfil.respostas;
  const info = INFO_ESTILO[perfil.estilo];
  const calculo = calcularEstilo(r);
  const passo = primeiroPasso(r);
  const tipos = tiposDoEstilo(perfil.estilo);
  const grupos = [...new Set(tipos.map((t) => CLASSES[t.classe].grupo))];
  const videos = videosDasClasses([...new Set(tipos.map((t) => t.classe))]);
  const desbloqueados = moedas.filter((m) => m.tipo === "desbloqueio").map((m) => m.referencia);
  const { saldo } = resumoMoedas(moedas);
  const faixas = ORDEM_CLASSES.filter((c) => FAIXAS[perfil.estilo][c].max > 0);
  const posicaoRegua = ESTILOS.indexOf(perfil.estilo);

  return (
    <section className="flex flex-col gap-7">
      <h1 className="animate-subir font-display text-2xl font-bold text-texto">Meu perfil</h1>

      {/* Cartão do estilo */}
      <div data-tema="escuro" className="relative animate-subir overflow-hidden rounded-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #141414 0%, #2A1606 50%, #7A3300 100%)" }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 animate-brilho rounded-full bg-indigo/45 blur-3xl" aria-hidden="true" />
        <p className="relative text-sm text-white/80">Seu estilo de investidor (educacional)</p>
        <p className="relative mt-1 font-display text-4xl font-bold">{perfil.estilo}</p>
        <p className="relative mt-1 inline-flex rounded-full bg-white/15 px-3 py-0.5 text-sm font-medium">{info.risco}</p>
        <p className="relative mt-3 text-sm leading-relaxed text-white/85">{info.frase}</p>

        <div className="relative mt-5" aria-label={`Régua de estilos: você está em ${perfil.estilo}`}>
          <div className="flex h-2 overflow-hidden rounded-full">
            <span className="flex-1 bg-menta/80" />
            <span className="flex-1 bg-ciano/80" />
            <span className="flex-1 bg-rosa/80" />
          </div>
          <span className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-fundo shadow-lg" style={{ left: `${(posicaoRegua * 2 + 1) * (100 / 6)}%` }} aria-hidden="true" />
          <div className="mt-2 grid grid-cols-3 text-center text-xs">
            {ESTILOS.map((e) => (
              <span key={e} className={e === perfil.estilo ? "font-bold text-white" : "text-white/65"}>
                {e}
              </span>
            ))}
          </div>
        </div>

        {calculo.motivoTrava ? (
          <p className="relative mt-4 flex items-start gap-2 rounded-2xl bg-black/25 px-3 py-2 text-xs text-white/90">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {calculo.motivoTrava}
          </p>
        ) : null}

        <Link href="/entrevista?refazer=1" className="relative mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white underline underline-offset-4">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refazer entrevista
        </Link>
      </div>

      {/* Primeiro passo */}
      <div className="rounded-3xl border border-ambar/50 bg-ambar/5 p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ambar">
          <Flag className="h-4 w-4" aria-hidden="true" />
          Seu primeiro passo
        </p>
        <p className="mt-2 font-display text-lg font-semibold text-texto">{passo.titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-suave">{passo.texto}</p>
      </div>

      {/* Vídeos */}
      {videos.length ? (
        <div className="flex flex-col gap-3">
          <TituloSecao titulo="Aprenda em 1 minuto" subtitulo="Vídeos sobre os tipos do seu estilo · +20 coins cada" />
          <GaleriaVideos videos={videos} concluidos={concluidos} desbloqueados={desbloqueados} saldo={saldo} />
        </div>
      ) : null}

      {/* Tipos de investimento do estilo */}
      <div className="flex flex-col gap-4">
        <TituloSecao titulo={`Investimentos do estilo ${perfil.estilo}`} subtitulo="Tipos que costumam compor carteiras deste estilo. Não são uma indicação para você." />
        {grupos.map((grupo) => (
          <div key={grupo} className="grid gap-3 lg:grid-cols-2">
            <p className="text-xs font-bold uppercase tracking-wider text-suave lg:col-span-2">{grupo}</p>
            {tipos
              .filter((t) => CLASSES[t.classe].grupo === grupo)
              .map((t) => (
                <Cartao key={t.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-1.5 rounded-full" style={{ background: CLASSES[t.classe].cor }} aria-hidden="true" />
                      <div>
                        <p className="font-display text-base font-semibold text-texto">{t.nome}</p>
                        <p className="text-xs text-suave">{CLASSES[t.classe].nome}</p>
                      </div>
                    </div>
                    <SeloRisco risco={t.risco} />
                  </div>
                  <p className="text-sm leading-relaxed text-suave">{t.resumo}</p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-superficie-2 px-3 py-2">
                      <dt className="text-suave">Liquidez</dt>
                      <dd className="mt-0.5 font-medium text-texto">{t.liquidez}</dd>
                    </div>
                    <div className="rounded-xl bg-superficie-2 px-3 py-2">
                      <dt className="text-suave">Garantia</dt>
                      <dd className="mt-0.5 font-medium text-texto">{t.garantia}</dd>
                    </div>
                  </dl>
                  <Link href={`/aprender/${t.classe}`} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-ciano">
                    Aprender <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Cartao>
              ))}
          </div>
        ))}
      </div>

      {/* Faixas de referência */}
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Faixas de referência" subtitulo={`Como carteiras do estilo ${perfil.estilo} costumam se dividir`} />
        <ul className="flex flex-col gap-3">
          {faixas.map((c) => {
            const { min, max } = FAIXAS[perfil.estilo][c];
            return (
              <li key={c}>
                <div className="flex justify-between text-sm">
                  <span className="text-texto">{CLASSES[c].nome}</span>
                  <span className="font-medium text-suave">
                    {min === max ? `${max}%` : `${min}% a ${max}%`}
                  </span>
                </div>
                <div className="relative mt-1.5 h-2 rounded-full bg-superficie-2">
                  <span className="absolute h-2 rounded-full" style={{ left: `${min}%`, width: `${Math.max(2, max - min)}%`, background: CLASSES[c].cor }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Cartao>

      {/* Resumo das respostas */}
      <Cartao className="flex flex-col gap-4">
        <TituloSecao titulo="Resumo das suas respostas" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Objetivo", r.objetivo_principal],
            ["Prazo", r.horizonte],
            ["Reserva", r.reserva_meses],
            ["Sobra mensal", r.sobra_mensal_faixa],
            ["Nível", r.nivel_declarado],
            ["Pontuação", `${calculo.pontuacao} de 7`],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-xs text-suave">{rotulo}</dt>
              <dd className="mt-0.5 font-medium text-texto">{valor}</dd>
            </div>
          ))}
        </dl>
        <Link href="/entrevista?refazer=1" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-ciano">
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          Editar respostas
        </Link>
      </Cartao>

      {/* Carteira */}
      {!carteira ? (
        <div className="borda-gradiente rounded-3xl p-5">
          <p className="font-display text-lg font-semibold text-texto">Já investe?</p>
          <p className="mt-1 text-sm text-suave">Importe sua carteira (PDF, planilha da B3 ou digitando) e veja se ela combina com seu estilo. Ganhe +50 coins.</p>
          <div className="mt-4">
            <BotaoLink href="/carteira/importar">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar minha carteira
            </BotaoLink>
          </div>
        </div>
      ) : null}

      <AvisoEducacional />
    </section>
  );
}

export const metadata = { title: "Meu perfil" };
