import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Logo, Mascote } from "./Logo";
import { AlternarTema } from "./AlternarTema";

// Moldura das telas de acesso (login, cadastro, verificação, senha).
// No computador, à esquerda aparece um recorte do produto em uso; à direita, o formulário.
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
    <div className="min-h-dvh bg-superficie lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside data-tema="escuro" className="relative hidden overflow-hidden bg-noite lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-1 flex-col px-14 py-12 xl:px-20">
          <Logo />
          <div className="mt-auto max-w-[30rem]">
            <h2 className="font-display text-[2.6rem] font-black leading-[1.05] tracking-[-0.02em] text-white">
              Suas finanças em ordem em 10 minutos por mês.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#A9B4E0]">
              Registre os saldos, compare o rendimento com o CDI e estude só o que faz diferença para a sua carteira. Sem planilha e sem vendedor.
            </p>
          </div>
          <ProdutoEmUso />
          <p className="mt-10 text-xs text-[#7F8BC0]">Conteúdo educacional. O Findomo não recomenda nem vende investimentos.</p>
        </div>
      </aside>

      <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col px-6 pb-8 pt-8 lg:py-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo tamanho="sm" />
          </span>
          <AlternarTema />
        </div>
        <div className="my-auto pt-12 lg:pt-0">
          <h1 className="font-display text-[1.9rem] font-black leading-tight tracking-[-0.01em] text-texto">{titulo}</h1>
          {subtitulo ? <p className="mt-2 text-[15px] leading-relaxed text-suave">{subtitulo}</p> : null}
          <div className="mt-8">{children}</div>
          {rodape ? <div className="mt-8 border-t border-linha pt-6">{rodape}</div> : null}
        </div>
        <p className="pt-10 text-xs leading-relaxed text-suave lg:hidden">Conteúdo educacional. O Findomo não recomenda nem vende investimentos.</p>
      </main>
    </div>
  );
}

// Recorte ilustrativo das telas do app (dados de exemplo).
function ProdutoEmUso() {
  return (
    <div className="relative mt-10 grid max-w-[30rem] gap-3" aria-label="Exemplo do app: patrimônio, tarefas do dia e um aviso do Findomo">
      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#A9B4E0]">Patrimônio · novembro</span>
          <span className="rounded bg-[#22C55E]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">104% do CDI</span>
        </div>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="font-display text-2xl font-black tabular-nums text-white">R$ 48.210,34</p>
          <svg viewBox="0 0 120 32" className="h-8 w-28" aria-hidden="true">
            <path d="M0 26 L15 24 L30 25 L45 19 L60 20 L75 14 L90 15 L105 8 L120 6" fill="none" stroke="#8FA8FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-1 text-xs text-[#A9B4E0]">
          <span className="font-semibold text-[#4ADE80]">+R$ 412,80</span> de rendimento no mês, sem contar os aportes
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs text-[#A9B4E0]">Para hoje · 2 de 3</p>
        <ul className="mt-2 flex flex-col gap-2 text-[13px]">
          {[
            { feito: true, texto: "Atualizar o saldo do Tesouro Selic 2029" },
            { feito: true, texto: "Registrar o aporte de R$ 500 no CDB" },
            { feito: false, texto: "Ler “Suporte e resistência” (4 min)" },
          ].map((t) => (
            <li key={t.texto} className="flex items-center gap-2.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${t.feito ? "border-[#2D5BFF] bg-[#2D5BFF]" : "border-white/30"}`}
                aria-hidden="true"
              >
                {t.feito ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <span className={t.feito ? "text-[#7F8BC0] line-through decoration-white/20" : "text-white"}>{t.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
        <Mascote className="h-9 w-9 shrink-0" />
        <p className="text-[13px] leading-relaxed text-[#C7D2FF]">
          Sua LCI tem carência até <strong className="font-semibold text-white">14/01</strong>. Até lá, esse dinheiro não pode ser resgatado: vale contar com isso no planejamento.
        </p>
      </div>
    </div>
  );
}
