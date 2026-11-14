"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Flame,
  Loader2,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import {
  PASSO_RITMO,
  nomeMes,
  planejar,
  type Categoria,
  type Diagnostico,
  type MetaEconomia,
  type MetaGuardar,
  type Plano,
  type RitmoGuardar,
} from "@/lib/dominio/financas";
import {
  encerrarMeta,
  encerrarMetaGuardar,
  gerarPlanoIA,
  salvarMeta,
  salvarMetaGuardar,
} from "@/app/acoes-financas";
import { Mascote } from "@/components/Logo";
import { IconeCategoria } from "@/components/financas/IconeCategoria";
import { brl0, lerValor } from "@/components/financas/formato";

type Dias = 30 | 60 | 90;

const DESTINOS = [
  "Reserva de emergência",
  "Renda fixa",
  "FIIs",
  "Ações",
  "Previdência",
  "Objetivo pessoal",
];
const TATICAS: Record<string, string> = {
  delivery: "pedir só no fim de semana e cozinhar em lote no domingo",
  alimentacao:
    "levar marmita dois dias por semana e trocar um jantar fora por um em casa",
  lazer: "alternar programas pagos com gratuitos e definir um teto por saída",
  compras: "esperar 48 horas antes de comprar o que não estava planejado",
  assinaturas:
    "cancelar o serviço menos usado e revezar os de streaming por mês",
  cuidados: "espaçar um pouco os serviços e comparar preços",
  transporte:
    "juntar deslocamentos e trocar parte das corridas por transporte público",
  outros: "anotar cada gasto avulso por uma semana para achar o vazamento",
};

const PASSOS = [
  { titulo: "Ponto de partida", Icone: Compass },
  { titulo: "Quanto guardar", Icone: Trophy },
  { titulo: "Plano de aporte", Icone: Target },
  { titulo: "Revisão", Icone: CheckCircle2 },
] as const;

function textoLocal(
  plano: Plano,
  diag: Diagnostico,
  destino: string,
  meses: number,
  nome: (id: string) => string,
) {
  const linhas: string[] = [];
  linhas.push(
    `Nos últimos ${diag.meses.length || 1} ${diag.meses.length === 1 ? "mês" : "meses"} entraram, em média, ${brl0(diag.receitaMedia)} e saíram ${brl0(diag.despesaMedia)}, sobrando ${brl0(Math.max(0, diag.sobraMedia))}. ` +
      (plano.faltaCortar <= 0
        ? `Essa sobra já cobre os ${brl0(plano.metaMensal)} por mês: basta separar o valor logo que o salário cair.`
        : plano.atingivel
          ? `Para chegar a ${brl0(plano.metaMensal)} por mês faltam ${brl0(plano.faltaCortar)}, e dá para tirar isso só dos gastos variáveis.`
          : `Chegar a ${brl0(plano.metaMensal)} por mês exige cortar ${brl0(plano.faltaCortar)}; com ajustes realistas consigo ${brl0(plano.cortado)}. Vale começar por aí e revisar a meta.`),
  );
  for (const c of plano.cortes.slice(0, 4)) {
    linhas.push(
      `• ${nome(c.categoriaId)}: reduzir ${c.percentual}% (≈ ${brl0(c.corteMensal)}/mês), ${TATICAS[c.categoriaId] ?? "revisando os gastos menos importantes"}.`,
    );
  }
  linhas.push(
    `Mantendo o ritmo, em ${meses} ${meses === 1 ? "mês" : "meses"} você terá separado ${brl0(plano.totalNoPeriodo)} para ${destino.toLowerCase()}. Moradia, saúde, educação e contas da casa ficaram de fora dos cortes.`,
  );
  return linhas.join("\n");
}

// Jornada de criação do plano financeiro: ponto de partida, meta de guardar (% da renda e ritmo),
// plano de aporte (valor, prazo e destino) e revisão. Finanças só mostra o plano depois de ativado.
export function JornadaPlano({
  diagnosticos,
  categorias,
  meta,
  metaGuardar,
  rendaAtual,
  ia,
  temLancamentos,
}: {
  diagnosticos: Record<Dias, Diagnostico>;
  categorias: Categoria[];
  meta: MetaEconomia | null;
  metaGuardar: MetaGuardar | null;
  rendaAtual: number;
  ia: boolean;
  temLancamentos: boolean;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [dias, setDias] = useState<Dias>(90);
  const [alvo, setAlvo] = useState(
    metaGuardar?.alvoPct ??
      Math.min(60, Math.max(10, Math.ceil((rendaAtual + 10) / 5) * 5)),
  );
  const [ritmo, setRitmo] = useState<RitmoGuardar>(
    metaGuardar?.ritmo ?? "moderado",
  );
  const [valorTexto, setValorTexto] = useState<string | null>(
    meta ? String(meta.valorMensal) : null,
  );
  const [meses, setMeses] = useState(meta?.meses ?? 12);
  const [destino, setDestino] = useState(
    meta?.destino ?? "Reserva de emergência",
  );
  const [nomeMeta, setNomeMeta] = useState(meta?.nome ?? "");
  const [textoIA, setTextoIA] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [pendente, iniciar] = useTransition();

  const cat = (id: string) => categorias.find((c) => c.id === id);
  const nome = (id: string) => cat(id)?.nome ?? "Outros";
  const diag = diagnosticos[dias];
  const sugerido = Math.max(
    10,
    Math.round((diag.receitaMedia * alvo) / 100 / 10) * 10,
  );
  const valorMensal =
    valorTexto === null ? sugerido : (lerValor(valorTexto) ?? 0);
  const plano = useMemo(
    () => planejar(diag, valorMensal, meses),
    [diag, valorMensal, meses],
  );
  const narrativa = textoIA ?? textoLocal(plano, diag, destino, meses, nome);
  const mesesAteAlvo = Math.max(
    0,
    Math.ceil((alvo - Math.min(rendaAtual, alvo)) / PASSO_RITMO[ritmo].passo),
  );
  const temPlano = Boolean(meta || metaGuardar);

  if (!temLancamentos) {
    return (
      <div className="painel flex flex-col items-center gap-3 p-8 text-center">
        <Mascote className="h-12 w-12" />
        <p className="font-semibold text-texto">
          Primeiro, conte para mim como entra e sai o seu dinheiro
        </p>
        <p className="max-w-sm text-sm text-suave">
          Lance suas receitas e despesas (ou carregue o exemplo em Finanças).
          Com isso eu monto o ponto de partida da sua jornada.
        </p>
        <Link
          href="/financas"
          className="mt-1 flex h-11 items-center rounded-full border border-linha px-5 text-sm font-semibold text-texto hover:bg-superficie-2"
        >
          Ir para Finanças
        </Link>
      </div>
    );
  }

  function ativar() {
    setErro(null);
    iniciar(async () => {
      const g = await salvarMetaGuardar({ alvoPct: alvo, ritmo });
      if ("erro" in g) return setErro(g.erro);
      const m = await salvarMeta({
        nome: nomeMeta.trim() || `${brl0(valorMensal)}/mês para ${destino}`,
        destino,
        valorMensal,
        meses,
        dias,
      });
      if ("erro" in m) return setErro(m.erro);
      router.push("/financas");
      router.refresh();
    });
  }

  function encerrarTudo() {
    if (
      !window.confirm(
        "Encerrar o seu plano atual? A meta de guardar e o plano de aporte deixam de aparecer em Finanças. Seus lançamentos continuam.",
      )
    )
      return;
    iniciar(async () => {
      if (meta) await encerrarMeta(meta.id);
      if (metaGuardar) await encerrarMetaGuardar();
      router.push("/financas");
      router.refresh();
    });
  }

  async function escrever() {
    setErro(null);
    setEscrevendo(true);
    const r = await gerarPlanoIA({ valorMensal, meses, destino, dias });
    setEscrevendo(false);
    if ("erro" in r) setErro(r.erro);
    else setTextoIA(r.texto);
  }

  const podeAvancar = passo !== 2 || valorMensal >= 10;
  function ir(n: number) {
    setPasso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Etapas */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas da jornada">
        {PASSOS.map((p, i) => {
          const feito = i < passo;
          const atual = i === passo;
          return (
            <li key={p.titulo}>
              <button
                type="button"
                onClick={() => i <= passo && ir(i)}
                disabled={i > passo}
                aria-current={atual ? "step" : undefined}
                className="flex w-full flex-col items-center gap-1.5 text-center disabled:cursor-default sm:flex-row sm:text-left"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition ${atual ? "degrade-ativo text-white" : feito ? "bg-ciano/15 text-ciano" : "bg-superficie-2 text-suave"}`}
                >
                  {feito ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <p.Icone className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold leading-tight sm:text-sm ${atual ? "text-texto" : "text-suave"}`}
                >
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {p.titulo}
                </span>
              </button>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-superficie-2">
                <span
                  className={`block h-full rounded-full transition-all ${i <= passo ? "degrade-ativo w-full" : "w-0"}`}
                />
              </span>
            </li>
          );
        })}
      </ol>

      <div className="painel flex flex-col gap-6 p-5 lg:p-7">
        {passo === 0 ? (
          <>
            <Cabecalho
              titulo="Seu ponto de partida"
              texto="Antes de traçar a meta, veja como o seu dinheiro se comporta hoje. Tudo vem dos seus lançamentos."
            />
            <div
              className="flex rounded-full border border-linha bg-superficie-2 p-1 sm:w-fit"
              role="radiogroup"
              aria-label="Período"
            >
              {([30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={dias === d}
                  onClick={() => {
                    setDias(d);
                    setTextoIA(null);
                  }}
                  className={`min-h-9 flex-1 rounded-full px-3.5 text-xs font-semibold sm:flex-none ${dias === d ? "bg-superficie text-texto shadow" : "text-suave hover:text-texto"}`}
                >
                  {d} dias
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  rotulo: "Entra por mês",
                  valor: brl0(diag.receitaMedia),
                  cor: "text-menta",
                },
                {
                  rotulo: "Sai por mês",
                  valor: brl0(diag.despesaMedia),
                  cor: "text-texto",
                },
                {
                  rotulo: "Essenciais",
                  valor: brl0(diag.fixasMedia),
                  cor: "text-texto",
                },
                {
                  rotulo: "Sobra por mês",
                  valor: brl0(diag.sobraMedia),
                  cor: diag.sobraMedia >= 0 ? "text-ciano" : "text-erro",
                },
              ].map((x) => (
                <div
                  key={x.rotulo}
                  className="rounded-xl bg-superficie-2/60 p-3.5"
                >
                  <p className="text-xs text-suave">{x.rotulo}</p>
                  <p
                    className={`font-display text-lg font-bold tabular-nums ${x.cor}`}
                  >
                    {x.valor}
                  </p>
                </div>
              ))}
            </div>
            <div className="degrade-ativo flex items-center gap-4 rounded-2xl p-4 text-white">
              <PiggyBank className="h-8 w-8 shrink-0" aria-hidden="true" />
              <p className="text-sm">
                Hoje você guarda cerca de{" "}
                <strong className="font-display text-xl">{rendaAtual}%</strong>{" "}
                da sua renda. A referência de muitos planejadores é 20%.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-texto">
                  <TrendingDown
                    className="h-4 w-4 text-gravata"
                    aria-hidden="true"
                  />{" "}
                  Onde dá para ajustar
                </h3>
                {diag.ralos.length ? (
                  <ul className="flex flex-col gap-2">
                    {diag.ralos.slice(0, 4).map((r) => {
                      const c = cat(r.categoriaId);
                      return (
                        <li
                          key={r.categoriaId}
                          className="flex items-start gap-3 rounded-xl border border-linha p-3"
                        >
                          <IconeCategoria
                            icone={c?.icone ?? "Tag"}
                            cor={c?.cor ?? "#94A3B8"}
                            tamanho={30}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-baseline justify-between gap-2 text-sm">
                              <span className="font-semibold text-texto">
                                {nome(r.categoriaId)}
                              </span>
                              <span className="shrink-0 tabular-nums text-texto">
                                {brl0(r.mediaMensal)}/mês
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-suave">
                              {r.motivo}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-linha p-4 text-sm text-suave">
                    Nenhum gasto variável fora do padrão. Bom sinal.
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-texto">
                  <Repeat className="h-4 w-4 text-ciano" aria-hidden="true" />{" "}
                  Cobranças que se repetem
                </h3>
                {diag.assinaturas.length ? (
                  <ul className="divide-y divide-linha rounded-xl border border-linha">
                    {diag.assinaturas.map((a) => (
                      <li
                        key={a.descricao}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                      >
                        <span className="truncate text-texto">
                          {a.descricao}
                        </span>
                        <span className="shrink-0 tabular-nums text-suave">
                          {brl0(a.valorMensal)}/mês
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-3 bg-superficie-2/40 px-3.5 py-2.5 text-sm font-semibold">
                      <span className="text-texto">Total por ano</span>
                      <span className="tabular-nums text-texto">
                        {brl0(
                          diag.assinaturas.reduce(
                            (s, a) => s + a.valorMensal,
                            0,
                          ) * 12,
                        )}
                      </span>
                    </li>
                  </ul>
                ) : (
                  <p className="rounded-xl border border-linha p-4 text-sm text-suave">
                    Nenhuma assinatura identificada.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : passo === 1 ? (
          <>
            <Cabecalho
              titulo="Quanto da renda você quer guardar"
              texto="Escolha onde quer chegar e em que ritmo. A meta sobe um degrau por mês, e cada degrau batido vale 40 coins."
            />
            <label className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between text-xs font-semibold text-suave">
                Quero guardar
                <span className="font-display text-3xl font-semibold tabular-nums text-texto">
                  {alvo}%
                </span>
              </span>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={alvo}
                onChange={(e) => setAlvo(Number(e.target.value))}
                className="accent-[var(--destaque)]"
              />
              <span className="flex justify-between text-[11px] text-suave">
                <span>5%</span>
                <span>hoje: {rendaAtual}% · referência: 20%</span>
                <span>60%</span>
              </span>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-suave">Ritmo</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PASSO_RITMO) as RitmoGuardar[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRitmo(r)}
                    aria-pressed={ritmo === r}
                    className={`flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-3.5 text-center transition ${ritmo === r ? "degrade-ativo border-transparent text-white" : "border-linha text-texto hover:bg-superficie-2"}`}
                  >
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      {r === "agressivo" ? (
                        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {PASSO_RITMO[r].rotulo}
                    </span>
                    <span
                      className={`text-[11px] ${ritmo === r ? "text-white/80" : "text-suave"}`}
                    >
                      {PASSO_RITMO[r].texto}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-superficie-2/60 p-3.5">
                <p className="text-xs text-suave">
                  Com a sua renda média, {alvo}% são
                </p>
                <p className="font-display text-lg font-bold tabular-nums text-texto">
                  {brl0((diag.receitaMedia * alvo) / 100)} por mês
                </p>
              </div>
              <div className="rounded-xl bg-superficie-2/60 p-3.5">
                <p className="text-xs text-suave">Você chega lá em</p>
                <p className="font-display text-lg font-bold text-texto">
                  {mesesAteAlvo === 0
                    ? "já chegou: o desafio é manter"
                    : `${mesesAteAlvo} ${mesesAteAlvo === 1 ? "mês" : "meses"}`}
                </p>
              </div>
            </div>
          </>
        ) : passo === 2 ? (
          <>
            <Cabecalho
              titulo="Seu plano de aporte"
              texto="Quanto da sobra vai para investimentos, por quanto tempo e com qual objetivo. Eu mostro onde ajustar sem mexer no essencial."
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-suave">
                    Quanto investir por mês
                  </span>
                  <span className="flex h-12 items-center gap-2 rounded-xl border border-linha bg-superficie-2 px-3.5 focus-within:border-ciano">
                    <span className="text-suave">R$</span>
                    <input
                      value={valorTexto ?? String(sugerido)}
                      onChange={(e) => {
                        setValorTexto(e.target.value);
                        setTextoIA(null);
                      }}
                      inputMode="decimal"
                      className="w-full bg-transparent font-display text-lg font-bold tabular-nums text-texto outline-none"
                    />
                  </span>
                  {valorTexto === null ? (
                    <span className="text-[11px] text-suave">
                      Sugestão: {alvo}% da sua renda média, a meta do passo
                      anterior.
                    </span>
                  ) : null}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-xs font-semibold text-suave">
                    Por quanto tempo{" "}
                    <span className="text-texto">
                      {meses} {meses === 1 ? "mês" : "meses"}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={meses}
                    onChange={(e) => {
                      setMeses(Number(e.target.value));
                      setTextoIA(null);
                    }}
                    className="accent-[var(--destaque)]"
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-suave">
                    Objetivo do dinheiro
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DESTINOS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDestino(d);
                          setTextoIA(null);
                        }}
                        className={`min-h-9 rounded-full border px-3 text-[13px] font-medium ${destino === d ? "border-ciano bg-ciano/10 text-texto" : "border-linha text-suave"}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-suave">
                    Nome do plano (opcional)
                  </span>
                  <input
                    value={nomeMeta}
                    onChange={(e) => setNomeMeta(e.target.value)}
                    maxLength={60}
                    placeholder={`${brl0(valorMensal)}/mês para ${destino}`}
                    className="h-11 rounded-xl border border-linha bg-superficie-2 px-3.5 text-sm text-texto outline-none placeholder:text-suave/70 focus:border-ciano"
                  />
                </label>
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <div
                  className={`flex items-start gap-3 rounded-2xl p-4 ${plano.atingivel ? "bg-menta/10" : "bg-gravata/10"}`}
                >
                  {plano.atingivel ? (
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-menta"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-gravata"
                      aria-hidden="true"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-semibold text-texto">
                      {plano.faltaCortar <= 0
                        ? "A sobra atual já cobre esse aporte"
                        : plano.atingivel
                          ? `Alcançável cortando ${brl0(plano.cortado)} por mês`
                          : `Os cortes realistas chegam a ${brl0(plano.sobraAtual + plano.cortado)} de ${brl0(plano.metaMensal)}`}
                    </p>
                    <p className="mt-0.5 text-suave">
                      Em {meses} {meses === 1 ? "mês" : "meses"}:{" "}
                      {brl0(plano.totalNoPeriodo)} para {destino.toLowerCase()}.
                    </p>
                  </div>
                </div>
                {plano.cortes.length ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-suave">
                      Limites que vou acompanhar por categoria
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {plano.cortes.map((c) => {
                        const ct = cat(c.categoriaId);
                        return (
                          <li
                            key={c.categoriaId}
                            className="flex items-center gap-3"
                          >
                            <IconeCategoria
                              icone={ct?.icone ?? "Tag"}
                              cor={ct?.cor ?? "#94A3B8"}
                              tamanho={30}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="flex items-baseline justify-between gap-2 text-sm">
                                <span className="truncate font-medium text-texto">
                                  {nome(c.categoriaId)}
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums text-erro">
                                  −{brl0(c.corteMensal)}
                                </span>
                              </p>
                              <p className="text-xs text-suave">
                                de {brl0(c.mediaMensal)} para{" "}
                                {brl0(c.limiteMensal)} por mês ({c.percentual}%)
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-linha p-4 text-sm text-suave">
                    Não precisa cortar nada: a sobra atual já cobre o aporte.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <Cabecalho
              titulo="Revise o seu plano"
              texto="É isso que vai aparecer em Finanças para você acompanhar mês a mês. Dá para refazer quando quiser."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-2xl border border-linha p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-suave">
                  <Trophy
                    className="h-3.5 w-3.5 text-ciano"
                    aria-hidden="true"
                  />{" "}
                  Meta de guardar
                </p>
                <p className="font-display text-2xl font-semibold text-texto">
                  {alvo}% da renda
                </p>
                <p className="text-sm text-suave">
                  Ritmo {PASSO_RITMO[ritmo].rotulo.toLowerCase()} (
                  {PASSO_RITMO[ritmo].texto}), saindo de{" "}
                  {Math.min(rendaAtual, alvo)}%
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border border-linha p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-suave">
                  <Target
                    className="h-3.5 w-3.5 text-ciano"
                    aria-hidden="true"
                  />{" "}
                  Plano de aporte
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-texto">
                  {brl0(valorMensal)} por mês
                </p>
                <p className="text-sm text-suave">
                  {meses} {meses === 1 ? "mês" : "meses"} para{" "}
                  {destino.toLowerCase()} · total {brl0(plano.totalNoPeriodo)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-linha bg-superficie-2/40 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-suave">
                <Mascote className="h-5 w-5" />{" "}
                {textoIA ? "Plano escrito pela IA" : "Como vamos chegar lá"}
              </p>
              <div className="whitespace-pre-line text-sm leading-relaxed text-texto">
                {narrativa}
              </div>
              {ia ? (
                <button
                  type="button"
                  onClick={escrever}
                  disabled={escrevendo}
                  className="mt-3 flex h-9 items-center gap-1.5 rounded-full border border-linha px-3.5 text-xs font-semibold text-texto hover:bg-superficie-2 disabled:opacity-50"
                >
                  {escrevendo ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles
                      className="h-3.5 w-3.5 text-ciano"
                      aria-hidden="true"
                    />
                  )}
                  Pedir à IA para escrever
                </button>
              ) : null}
            </div>
            {temPlano ? (
              <p className="text-xs text-suave">
                Ativar substitui o plano atual
                {meta
                  ? ` (desde ${nomeMes(meta.inicio).toLowerCase()})`
                  : ""}.{" "}
                <button
                  type="button"
                  onClick={encerrarTudo}
                  disabled={pendente}
                  className="font-semibold text-suave underline hover:text-erro"
                >
                  Ou encerre o plano sem criar outro
                </button>
              </p>
            ) : null}
          </>
        )}

        {erro ? (
          <p
            role="alert"
            className="rounded-xl bg-erro/10 px-3 py-2 text-sm text-erro"
          >
            {erro}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-linha pt-5">
          {passo > 0 ? (
            <button
              type="button"
              onClick={() => ir(passo - 1)}
              className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-suave hover:bg-superficie-2 hover:text-texto"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
            </button>
          ) : (
            <Link
              href="/financas"
              className="flex h-11 items-center rounded-full px-4 text-sm font-semibold text-suave hover:bg-superficie-2 hover:text-texto"
            >
              Agora não
            </Link>
          )}
          {passo < PASSOS.length - 1 ? (
            <button
              type="button"
              onClick={() => ir(passo + 1)}
              disabled={!podeAvancar}
              className="gradiente-marca flex h-11 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              Continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={ativar}
              disabled={pendente || valorMensal < 10}
              className="gradiente-marca flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {pendente ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Ativar meu plano
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Cabecalho({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-texto lg:text-2xl">
        {titulo}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-suave">{texto}</p>
    </div>
  );
}
