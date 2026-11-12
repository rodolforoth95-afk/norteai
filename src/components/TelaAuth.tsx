import type { ReactNode } from "react";
import { BookOpen, CandlestickChart, ShieldCheck } from "lucide-react";
import { Logo, Mascote } from "./Logo";
import { AvisoEducacional } from "./AvisoEducacional";
import { AlternarTema } from "./AlternarTema";

const DESTAQUES = [
  { Icone: BookOpen, titulo: "Aprenda do zero", texto: "6 trilhas, vídeos de 1 minuto e quizzes com coins." },
  { Icone: CandlestickChart, titulo: "Acompanhe o mercado", texto: "Cotações, gráficos e destaques da B3." },
  { Icone: ShieldCheck, titulo: "Sem vender nada", texto: "Conteúdo educacional. Não pedimos CPF nem dados bancários." },
];

// Moldura das telas de acesso (login, cadastro, verificação, senha).
// No computador, a tela se divide: apresentação da marca à esquerda e formulário à direita.
export function TelaAuth({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside
        data-tema="escuro"
        className="gradiente-noite relative hidden overflow-hidden p-12 text-texto lg:flex lg:flex-col lg:justify-between"
      >
        <Mascote className="pointer-events-none absolute -bottom-16 -right-16 h-[26rem] w-[26rem] opacity-[0.08]" />
        <Logo tamanho="lg" />
        <div className="relative max-w-md">
          <div className="mb-6 flex items-end gap-4">
            <Mascote className="h-24 w-24 drop-shadow-xl" piscando />
            <p className="mb-3 rounded-3xl rounded-bl-md bg-white px-4 py-2 font-display text-lg font-extrabold text-noite">Oi! Eu sou o Findomo.</p>
          </div>
          <h2 className="font-display text-4xl font-black leading-tight">
            Pode perguntar. <span className="text-[#8FA8FF]">Estou aqui pra isso.</span>
          </h2>
          <p className="mt-3 text-suave">Seu mordomo das finanças: explico, comparo e simulo, no seu ritmo e sem vender nenhum produto.</p>
          <ul className="mt-10 flex flex-col gap-6">
            {DESTAQUES.map(({ Icone, titulo: t, texto }) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ciano">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-display font-semibold">{t}</span>
                  <span className="block text-sm text-suave">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-suave">Conteúdo educacional. Não é recomendação de investimento.</p>
      </aside>

      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-10 lg:justify-center lg:py-12">
        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <AlternarTema />
        </div>
        <div className="hidden justify-end lg:flex">
          <AlternarTema />
        </div>
        <div className="mt-10 flex animate-subir flex-col gap-3 lg:mt-6">
          <h1 className="font-display text-[2rem] font-bold leading-tight text-texto">{titulo}</h1>
          {subtitulo ? <p className="text-base text-suave">{subtitulo}</p> : null}
        </div>
        <div className="mt-8 flex-1 animate-subir [animation-delay:80ms] lg:flex-none">{children}</div>
        <footer className="mt-10 flex flex-col gap-4">
          {rodape}
          <AvisoEducacional />
        </footer>
      </main>
    </div>
  );
}
