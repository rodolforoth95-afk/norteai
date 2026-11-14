import { hojeBR } from "@/lib/dominio/carteira";
import {
  diagnosticar,
  dreDosMeses,
  escadaGuardar,
  evolucaoFinanceira,
  insights,
  rendaGuardadaAtual,
  mesDe,
  ocorrenciasDoMes,
  orcamentoDoMes,
  planosDe,
  progressoMeta,
  resumoDoMes,
  serieDeMeses,
  somarMeses,
} from "@/lib/dominio/financas";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { aportesPorMes, carregarFinancas } from "@/lib/servidor/financas";
import { RECOMPENSAS } from "@/lib/dominio/moedas";
import { PainelFinancas } from "./PainelFinancas";
import { VazioFinancas } from "./VazioFinancas";
import { EscolherPlano } from "./EscolherPlano";

export const metadata = { title: "Finanças" };

// Receitas e despesas do mês: cartões, fluxo de caixa com o que foi reinvestido,
// gastos por categoria (o gráfico filtra a lista), orçamento do plano e o Mordomo.
export default async function PaginaFinancas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; p?: string }>;
}) {
  const { uid, repo, primeiroNome } = await exigirUsuario();
  const [dados, aportes] = await Promise.all([
    carregarFinancas(repo, uid),
    aportesPorMes(repo, uid),
  ]);
  const hoje = hojeBR();
  const mesAtual = mesDe(hoje);
  const { mes: pedido, p: planoPedido } = await searchParams;
  const mes =
    pedido &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) &&
    pedido <= somarMeses(mesAtual, 12) &&
    pedido >= "2000-01"
      ? pedido
      : mesAtual;

  if (!dados.lancamentos.length) return <VazioFinancas />;

  // Toda entrada em Finanças começa pela escolha do plano.
  const planos = planosDe(dados);
  const meta =
    planoPedido && planoPedido !== "sem"
      ? (planos.find((m) => m.id === planoPedido) ?? null)
      : null;
  if (!planoPedido || (planoPedido !== "sem" && !meta)) {
    return (
      <EscolherPlano
        primeiroNome={primeiroNome}
        rendaAtual={rendaGuardadaAtual(dados, mesAtual)}
        planos={planos.map((m) => {
          const pr = progressoMeta(dados, m, mesAtual, aportes);
          const esc = m.guardar
            ? escadaGuardar(dados, m.guardar, mesAtual)
            : null;
          return {
            id: m.id,
            nome: m.nome,
            destino: m.destino,
            valorMensal: m.valorMensal,
            meses: m.meses,
            ativo: m.ativa,
            alvoPct: m.guardar?.alvoPct ?? null,
            ritmo: m.guardar?.ritmo ?? null,
            degrauPct: esc?.atual?.alvoPct ?? null,
            guardadoPct: esc?.atual?.guardadoPct ?? null,
            pct: pr.pct,
            economizado: pr.economizado,
            objetivo: pr.objetivo,
          };
        })}
      />
    );
  }
  const metaGuardar = meta?.guardar ?? null;

  const resumo = resumoDoMes(dados, mes);
  const anterior = resumoDoMes(dados, somarMeses(mes, -1));
  const serie = serieDeMeses(dados, mes, 6).map((r) => ({
    mes: r.mes,
    receitas: r.receitas,
    despesas: r.despesas,
    reinvestido: aportes[r.mes] ?? 0,
  }));
  const progresso = meta ? progressoMeta(dados, meta, mesAtual, aportes) : null;
  const orcamento = orcamentoDoMes(resumo, meta);
  const aportadoNoMes = aportes[mes] ?? 0;
  const mesesDre = [somarMeses(mes, -2), somarMeses(mes, -1), mes];
  const escada = metaGuardar
    ? escadaGuardar(dados, metaGuardar, mesAtual)
    : null;
  // Cada degrau batido em mês já fechado vale coins (uma vez por mês).
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

  return (
    <PainelFinancas
      hoje={hoje}
      mes={mes}
      mesAtual={mesAtual}
      resumo={resumo}
      anterior={anterior}
      serie={serie}
      aportadoNoMes={aportadoNoMes}
      ocorrencias={ocorrenciasDoMes(dados.lancamentos, mes)}
      categorias={dados.categorias}
      orcamento={orcamento}
      meta={
        meta
          ? {
              nome: meta.nome,
              destino: meta.destino,
              valorMensal: meta.valorMensal,
              meses: meta.meses,
            }
          : null
      }
      progresso={
        progresso
          ? {
              economizado: progresso.economizado,
              aportado: progresso.aportado,
              livreParaAportar: progresso.livreParaAportar,
              objetivo: progresso.objetivo,
              pct: progresso.pct,
              mesesPassados: progresso.mesesPassados,
            }
          : null
      }
      avisos={insights({
        resumo,
        anterior,
        orcamento,
        meta,
        livreParaAportar: progresso?.livreParaAportar ?? 0,
        categorias: dados.categorias,
        hoje,
      })}
      dre={dreDosMeses(dados, mesesDre, aportes)}
      evolucao={evolucaoFinanceira(dados, mes, aportes)}
      diagnostico={diagnosticar(dados, mesAtual, 90)}
      metaGuardar={metaGuardar}
      planoId={meta?.id ?? null}
      planoParam={planoPedido}
      escada={escada}
      rendaAtual={rendaGuardadaAtual(dados, mesAtual)}
      primeiroNome={primeiroNome}
      mesesDre={mesesDre}
      temExemplo={dados.lancamentos.some((l) => l.origem === "exemplo")}
    />
  );
}
