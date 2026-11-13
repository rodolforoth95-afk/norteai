import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, TriangleAlert } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { GaleriaVideos } from "@/components/GaleriaVideos";
import { Cartao, SeloRisco } from "@/components/ui";
import { aulaPorSlug } from "@/lib/conteudo/aulas";
import { VIDEOS } from "@/lib/conteudo/videos";
import { CLASSES, FAIXAS } from "@/lib/dominio/catalogo";
import { resumoMoedas } from "@/lib/dominio/moedas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { BotaoLido } from "./BotaoLido";
import { IlustracaoAula } from "@/components/Ilustracoes";
import { moduloDaAula } from "@/lib/conteudo/modulos";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: aulaPorSlug((await params).slug)?.titulo ?? "Aula" };
}

// Tela 6 — Conteúdo educativo
export default async function PaginaAula({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const aula = aulaPorSlug(slug);
  if (!aula) notFound();

  const { uid, repo } = await exigirUsuario();
  const [perfil, concluidos, moedas] = await Promise.all([
    repo.obterPerfil(uid),
    repo.listarConcluidos(uid),
    repo.listarMoedas(uid),
  ]);
  const video = VIDEOS.find((v) => v.slug === aula.video);
  const faixa = perfil && aula.classe ? FAIXAS[perfil.estilo][aula.classe] : null;
  const modulo = moduloDaAula(aula.slug);
  const indice = modulo ? modulo.aulas.indexOf(aula.slug) : -1;
  const proxima = modulo && indice < modulo.aulas.length - 1 ? aulaPorSlug(modulo.aulas[indice + 1]) : null;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href={modulo ? `/aprender/modulo/${modulo.slug}` : "/aprender"} className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        {modulo ? `${modulo.titulo} · aula ${indice + 1} de ${modulo.aulas.length}` : "Voltar"}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-linha px-2.5 py-0.5 text-suave">{aula.categoria}</span>
          {aula.risco ? <SeloRisco risco={aula.risco} /> : null}
          <span className="flex items-center gap-1 text-suave">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {aula.minutos} min de leitura
          </span>
        </div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.01em] leading-tight text-texto">{aula.titulo}</h1>
      </header>

      {video ? (
        <div className="w-40">
          <GaleriaVideos
            videos={[video]}
            concluidos={concluidos}
            desbloqueados={moedas.filter((m) => m.tipo === "desbloqueio").map((m) => m.referencia)}
            saldo={resumoMoedas(moedas).saldo}
            formato="grade"
          />
        </div>
      ) : aula.classe ? (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-linha text-sm text-suave">Vídeo em breve</div>
      ) : null}

      {aula.ilustracao ? <IlustracaoAula tipo={aula.ilustracao} /> : null}

      {aula.secoes.map((s) => (
        <section key={s.titulo} className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-texto">{s.titulo}</h2>
          {s.paragrafos?.map((p) => (
            <p key={p} className="leading-relaxed text-suave">
              {p}
            </p>
          ))}
          {s.passos ? (
            <ol className="mt-1 flex flex-col gap-3">
              {s.passos.map((p, i) => (
                <li key={p} className="flex gap-3">
                  <span className="gradiente-marca flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white">{i + 1}</span>
                  <span className="leading-relaxed text-suave">{p}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ))}

      {aula.formas.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold text-texto">Formas de ter acesso</h2>
          {aula.formas.map((f) => (
            <Cartao key={f.nome} className="flex flex-col gap-2">
              <p className="font-semibold text-texto">{f.nome}</p>
              <p className="text-sm text-suave">{f.texto}</p>
              <p className="flex items-start gap-2 text-sm text-ambar">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {f.atencao}
              </p>
            </Cartao>
          ))}
        </section>
      ) : null}

      {faixa && perfil && aula.classe ? (
        <div className="borda-gradiente rounded-2xl p-5">
          <p className="text-sm font-semibold text-texto">No seu estilo</p>
          <p className="mt-2 text-texto">
            {faixa.max === 0
              ? `Em carteiras de referência do estilo ${perfil.estilo}, ${CLASSES[aula.classe].nome.toLowerCase()} não costuma aparecer.`
              : `Em carteiras de referência do estilo ${perfil.estilo}, ${CLASSES[aula.classe].nome.toLowerCase()} costuma ocupar de ${faixa.min}% a ${faixa.max}%.`}
          </p>
        </div>
      ) : null}

      <BotaoLido slug={aula.slug} lido={concluidos.includes(`leitura:${aula.slug}`)} />
      {proxima ? (
        <Link href={`/aprender/${proxima.slug}`} className="flex items-center gap-3 painel p-4 transition hover:border-violeta">
          <span className="flex-1">
            <span className="block text-xs text-suave">Próxima aula</span>
            <span className="block font-display font-semibold text-texto">{proxima.titulo}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-ciano" aria-hidden="true" />
        </Link>
      ) : modulo ? (
        <Link href={`/aprender/modulo/${modulo.slug}`} className="flex items-center gap-3 painel p-4 transition hover:border-violeta">
          <span className="flex-1">
            <span className="block text-xs text-suave">Fim do módulo</span>
            <span className="block font-display font-semibold text-texto">Fazer o quiz de {modulo.titulo}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-ciano" aria-hidden="true" />
        </Link>
      ) : null}
      <AvisoEducacional extra="Rentabilidade passada não garante resultado futuro." />
    </article>
  );
}
