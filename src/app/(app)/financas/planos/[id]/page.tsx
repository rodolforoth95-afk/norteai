import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  Link2,
  Pencil,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";
import { hojeBR } from "@/lib/dominio/carteira";
import {
  escadaGuardar,
  mesDe,
  nomeMes,
  orcamentoDoMes,
  planosDe,
  progressoMeta,
  resumoDoMes,
} from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { aportesPorMes, carregarFinancas } from "@/lib/servidor/financas";
import { RECOMPENSAS } from "@/lib/dominio/moedas";
import { brl0 } from "@/components/financas/formato";
import { AnelOrcamento } from "@/components/financas/AnelOrcamento";
import { AvisoEducacional } from "@/components/AvisoEducacional";
import { DesafioGuardar } from "../../DesafioGuardar";
import { BotaoFoco } from "./BotaoFoco";

export const metadata = { title: "Plano" };

// Um plano: metas (guardar e investir) acompanhadas com os números do controle financeiro.
export default async function PaginaPlano({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uid, repo } = await exigirUsuario();
  const [dados, aportes] = await Promise.all([
    carregarFinancas(repo, uid),
    aportesPorMes(repo, uid),
  ]);
  const meta = planosDe(dados).find((m) => m.id === id);
  if (!meta) notFound();
  const mesAtual = mesDe(hojeBR());
  const resumo = resumoDoMes(dados, mesAtual);
  const pr = progressoMeta(dados, meta, mesAtual, aportes);
  const escada = meta.guardar
    ? escadaGuardar(dados, meta.guardar, mesAtual)
    : null;
  const orcamento = orcamentoDoMes(resumo, meta);
  const estourados = orcamento.filter((o) => o.estado === "estourou").length;
  if (escada) {
    for (const d of escada.degraus.filter((x) => x.estado === "batido")) {
      await repo
        .lancarMoedas(
          uid,
          "meta_guardar",
          d.mes,
          RECOMPENSAS.meta_guardar.valor,
        )
        .catch(() => false);
    }
  }
  const cat = (cid: string) => dados.categorias.find((c) => c.id === cid);

  const kpis = [
    {
      rotulo: "Guardado este mês",
      valor: escada?.atual
        ? `${Math.round(escada.atual.guardadoPct ?? 0)}%`
        : "—",
      detalhe: escada?.atual
        ? `meta do mês: ${escada.atual.alvoPct}% da renda`
        : "sem meta de guardar",
    },
    {
      rotulo: "Acumulado no plano",
      valor: brl0(pr.economizado),
      detalhe: `${Math.round(pr.pct)}% de ${brl0(pr.objetivo)}`,
    },
    {
      rotulo: "Já aportado na carteira",
      valor: brl0(pr.aportado),
      detalhe: "aplicações registradas na Carteira",
    },
    {
      rotulo: "Livre para investir",
      valor: brl0(pr.livreParaAportar),
      detalhe: "guardado e ainda não aportado",
      destaque: true,
    },
  ];

  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/financas/planos"
          className="inline-flex w-fit items-center gap-1 text-sm text-suave hover:text-texto"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Planos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {meta.ativa ? (
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ciano">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Em foco
                no controle financeiro
              </p>
            ) : null}
            <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.025em] text-texto lg:text-[2.25rem]">
              {meta.nome}
            </h1>
            <p className="mt-0.5 text-sm text-suave">
              {brl0(meta.valorMensal)} por mês para {meta.destino.toLowerCase()}{" "}
              · {meta.meses} meses desde {nomeMes(meta.inicio).toLowerCase()}
              {meta.guardar
                ? ` · guardar ${meta.guardar.alvoPct}% da renda`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {!meta.ativa ? <BotaoFoco id={meta.id} /> : null}
            <Link
              href={`/financas/planos/${meta.id}/editar`}
              className="flex h-10 items-center gap-1.5 rounded-full border border-linha bg-superficie px-4 text-sm font-semibold text-texto hover:bg-superficie-2"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
            </Link>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.rotulo}
            className={`painel flex min-w-0 flex-col gap-1 p-4 lg:p-5 ${k.destaque ? "bg-gravata/5" : ""}`}
          >
            <dt className="text-xs font-semibold text-suave">{k.rotulo}</dt>
            <dd
              className={`truncate font-display text-[1.35rem] font-bold tabular-nums lg:text-[1.6rem] ${k.destaque ? "text-gravata" : "text-texto"}`}
            >
              {k.valor}
            </dd>
            <dd className="truncate text-[11px] text-suave lg:text-xs">
              {k.detalhe}
            </dd>
          </div>
        ))}
      </dl>

      {meta.guardar && escada ? (
        <div className="painel p-5 lg:p-6">
          <DesafioGuardar
            meta={meta.guardar}
            escada={escada}
            categorias={dados.categorias}
          />
        </div>
      ) : (
        <div className="painel flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="flex items-center gap-2 text-sm text-suave">
            <Trophy className="h-4 w-4 text-ciano" aria-hidden="true" /> Este
            plano ainda não tem meta de guardar.
          </p>
          <Link
            href={`/financas/planos/${meta.id}/editar`}
            className="text-sm font-semibold text-ciano"
          >
            Definir meta
          </Link>
        </div>
      )}

      <div className="painel grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">
              Plano de aporte
            </h2>
            <p className="text-xs text-suave">
              Quanto sobrou em cada mês do plano, comparado com{" "}
              {brl0(meta.valorMensal)}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-semibold tabular-nums text-texto">
                {brl0(pr.economizado)}
              </span>
              <span className="text-xs tabular-nums text-suave">
                de {brl0(pr.objetivo)}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-superficie-2">
              <div
                className="degrade-ativo h-full rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, pr.pct))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-suave">
              mês {pr.mesesPassados} de {meta.meses}
            </p>
          </div>
          {pr.meses.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {pr.meses.slice(-6).map((m) => {
                const ok = m.sobra >= meta.valorMensal;
                return (
                  <li
                    key={m.mes}
                    className={`rounded-xl border p-2.5 text-center ${ok ? "border-menta/40 bg-menta/8" : "border-linha"}`}
                  >
                    <p className="text-[11px] text-suave">
                      {nomeMes(m.mes, true)}
                    </p>
                    <p
                      className={`text-sm font-bold tabular-nums ${ok ? "text-menta" : "text-texto"}`}
                    >
                      {brl0(m.sobra)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {pr.livreParaAportar >= 50 ? (
            <Link
              href="/carteira/adicionar"
              className="gradiente-marca flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-semibold text-white hover:brightness-110"
            >
              Registrar aporte de {brl0(pr.livreParaAportar)}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 lg:border-l lg:border-linha lg:pl-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-texto">
              Limites de {nomeMes(mesAtual).split(" ")[0].toLowerCase()}
            </h2>
            <p className="text-xs text-suave">
              {orcamento.length
                ? estourados
                  ? `${estourados} ${estourados === 1 ? "categoria passou" : "categorias passaram"} do limite`
                  : "Todas as categorias dentro do limite até agora"
                : "Este plano não precisou de cortes"}
            </p>
          </div>
          {orcamento.length ? (
            <ul className="grid grid-cols-3 gap-x-2 gap-y-5">
              {orcamento.map((o) => (
                <li key={o.categoriaId}>
                  <AnelOrcamento item={o} categoria={cat(o.categoriaId)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-linha p-4 text-sm text-suave">
              A sobra média já cobria o aporte quando o plano foi criado.
            </p>
          )}
        </div>
      </div>

      <div className="painel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ciano/12 text-ciano">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-texto">
              Ligado ao seu controle financeiro
            </h2>
            <p className="text-sm text-suave">
              Em {nomeMes(mesAtual).toLowerCase()}: entraram{" "}
              <strong className="font-semibold text-texto">
                {brl0(resumo.receitas)}
              </strong>
              , saíram{" "}
              <strong className="font-semibold text-texto">
                {brl0(resumo.despesas)}
              </strong>{" "}
              e sobraram{" "}
              <strong
                className={`font-semibold ${resumo.saldo >= 0 ? "text-ciano" : "text-erro"}`}
              >
                {brl0(resumo.saldo)}
              </strong>
              . Cada lançamento novo atualiza este plano.
            </p>
          </div>
        </div>
        <Link
          href="/financas"
          className="flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full border border-linha px-4 text-sm font-semibold text-texto hover:bg-superficie-2 lg:self-auto"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" /> Abrir controle{" "}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <AvisoEducacional extra="O plano usa apenas os seus lançamentos e não indica produtos financeiros." />
    </section>
  );
}
