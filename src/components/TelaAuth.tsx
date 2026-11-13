import type { ReactNode } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

// Moldura das telas de acesso (login, cadastro, verificação, senha): tela inteira escura
// com a faixa de luz da marca, título embaixo à esquerda e o formulário num cartão de vidro.
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
    <div data-tema="escuro" className="relative isolate min-h-dvh overflow-hidden bg-[#050817] text-texto">
      <FaixaDeLuz />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col px-5 pb-6 pt-5 sm:px-8 lg:px-12 lg:pb-12 lg:pt-8">
        {/* Topo: logo, selo central e selo de segurança */}
        <header className="relative flex h-11 items-center justify-between">
          <Logo />
          <p className="absolute left-1/2 top-[-1.25rem] hidden -translate-x-1/2 items-center gap-2.5 rounded-b-2xl bg-black/45 px-6 pb-3 pt-4 text-sm text-white/85 backdrop-blur-md lg:flex lg:top-[-2rem] lg:pt-5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7C9BFF] shadow-[0_0_10px_#7C9BFF]" aria-hidden="true" />
            Mordomo financeiro com IA
          </p>
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 text-[13px] text-white/80 backdrop-blur-md">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Conexão segura
          </span>
        </header>

        {/* Base: título à esquerda e formulário à direita, na mesma linha de base */}
        <div className="mt-auto grid items-end gap-6 pt-10 sm:gap-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-16 lg:pt-0">
          <div className="max-w-[52rem] pb-1">
            <h2 className="font-display text-[1.85rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[3rem] lg:text-[3.4rem] xl:text-[3.9rem]">
              Seu dinheiro em ordem,
              <span className="block text-[#8FA8FF]">explicado e acompanhado.</span>
            </h2>
            <p className="mt-5 hidden max-w-[34rem] text-[15px] leading-relaxed text-white/70 sm:block lg:text-[17px]">
              Carteira, mercado e simulações no mesmo lugar. O Findomo registra seus saldos, compara com o CDI e explica cada número, sem vender nenhum produto.
            </p>
          </div>

          <main className="w-full rounded-[1.75rem] border border-white/[0.12] bg-[#0B1233]/70 p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-2xl sm:p-8">
            <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] text-white">{titulo}</h1>
            {subtitulo ? <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{subtitulo}</p> : null}
            <div className="mt-7">{children}</div>
            {rodape ? <div className="mt-6">{rodape}</div> : null}
            <p className="mt-6 flex items-start gap-2.5 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-white/60">
              <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-[#7C9BFF]" aria-hidden="true" />
              Não pedimos CPF nem senha de banco. Conteúdo educacional, sem recomendação de investimento.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

// Faixa de luz fluida (azul-assistente → azul claro → laranja-gravata), desfocada como na marca.
function FaixaDeLuz() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_20%,rgb(143_168_255/0.28),transparent_70%)]" />
      <svg className="faixa-luz absolute -top-[8%] left-[-10%] h-[118%] w-[125%] min-w-[48rem]" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="faixa" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#2D5BFF" />
            <stop offset="45%" stopColor="#8FA8FF" />
            <stop offset="70%" stopColor="#FFB27A" />
            <stop offset="100%" stopColor="#FF8A3D" />
          </linearGradient>
          <filter id="desfoque-largo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
          <filter id="desfoque-curto" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <path d="M1020 -80 C 880 220, 1130 360, 860 560 S 360 820, 140 1080" fill="none" stroke="url(#faixa)" strokeWidth="260" strokeLinecap="round" opacity="0.5" filter="url(#desfoque-largo)" />
        <path d="M1020 -80 C 880 220, 1130 360, 860 560 S 360 820, 140 1080" fill="none" stroke="url(#faixa)" strokeWidth="70" strokeLinecap="round" opacity="0.9" filter="url(#desfoque-curto)" />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(55%_70%_at_0%_100%,rgb(5_8_23/0.92),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_8_23/0.75)_0%,transparent_45%)]" />
    </div>
  );
}
