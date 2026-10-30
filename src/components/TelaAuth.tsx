import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { AvisoEducacional } from "./AvisoEducacional";

// Moldura comum das telas de acesso (login, cadastro, verificação, senha).
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-10">
      <Logo />
      <div className="mt-10 flex animate-subir flex-col gap-3">
        <h1 className="font-display text-[2rem] font-bold leading-tight text-texto">{titulo}</h1>
        {subtitulo ? <p className="text-base text-suave">{subtitulo}</p> : null}
      </div>
      <div className="mt-8 flex-1 animate-subir [animation-delay:80ms]">{children}</div>
      <footer className="mt-10 flex flex-col gap-4">
        {rodape}
        <AvisoEducacional />
      </footer>
    </main>
  );
}
