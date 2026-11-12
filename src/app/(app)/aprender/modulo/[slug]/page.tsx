import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, Clock } from "lucide-react";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { IconeModulo } from "@/components/IconeModulo";
import { aulaPorSlug } from "@/lib/conteudo/aulas";
import { moduloPorSlug, progressoModulo } from "@/lib/conteudo/modulos";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { QuizModulo } from "./QuizModulo";

export default async function PaginaModulo({ params }: { params: Promise<{ slug: string }> }) {
  const modulo = moduloPorSlug((await params).slug);
  if (!modulo) notFound();
  const { uid, repo } = await exigirUsuario();
  const concluidos = await repo.listarConcluidos(uid);
  const { lidas, quiz, pct } = progressoModulo(modulo, concluidos);
  const aulas = modulo.aulas.map((s) => aulaPorSlug(s)!).filter(Boolean);
  const minutos = aulas.reduce((s, a) => s + a.minutos, 0);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/aprender" className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start font-medium text-suave hover:text-texto">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Trilhas
      </Link>

      <header className="flex items-start gap-4">
        <span className="gradiente-marca flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white">
          <IconeModulo icone={modulo.icone} className="h-8 w-8" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-texto">{modulo.titulo}</h1>
          <p className="mt-1 text-sm text-suave">{modulo.descricao}</p>
          <p className="mt-2 flex items-center gap-3 text-xs text-suave">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {minutos} min
            </span>
            <span>{aulas.length} aulas + quiz</span>
            <span className="font-semibold text-ciano">{pct}% concluído</span>
          </p>
        </div>
      </header>

      <ol className="flex flex-col gap-2">
        {aulas.map((a, i) => {
          const lida = concluidos.includes(`leitura:${a.slug}`);
          return (
            <li key={a.slug}>
              <Link href={`/aprender/${a.slug}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-linha bg-superficie px-4 py-3 transition hover:border-violeta">
                {lida ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-menta" aria-label="Concluída" />
                ) : (
                  <Circle className="h-6 w-6 shrink-0 text-linha" aria-label="Não concluída" />
                )}
                <span className="flex-1">
                  <span className="block text-xs text-suave">Aula {i + 1}</span>
                  <span className="block font-medium text-texto">{a.titulo}</span>
                </span>
                <span className="text-xs text-suave">{a.minutos} min</span>
                <ChevronRight className="h-5 w-5 text-suave" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>

      <QuizModulo
        modulo={modulo.slug}
        perguntas={modulo.quiz.map(({ pergunta, opcoes }) => ({ pergunta, opcoes }))}
        aprovado={quiz}
        liberado={lidas >= Math.ceil(aulas.length / 2)}
      />

      <AvisoEducacional />
    </section>
  );
}
