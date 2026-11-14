// Assistente de finanças: monta o resumo que a IA recebe e responde sozinha as perguntas
// mais comuns quando a IA não está ligada. Puro (roda no servidor e nos testes).
import { diagnosticar, escadaGuardar, nomeMes, normalizar, rendaGuardadaAtual, resumoDoMes, somarMeses, type FinancasDados } from "./financas";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function contextoFinancas(dados: FinancasDados, mesAtual: string, aportes: Record<string, number>) {
  const nome = (id: string) => dados.categorias.find((c) => c.id === id)?.nome ?? "Outros";
  const meses = [0, 1, 2, 3].map((i) => resumoDoMes(dados, somarMeses(mesAtual, -i)));
  const diag = diagnosticar(dados, mesAtual, 90);
  const linhas = meses.map(
    (r) =>
      `${nomeMes(r.mes)}${r.mes === mesAtual ? " (em andamento)" : ""}: receitas ${brl(r.receitas)}, despesas ${brl(r.despesas)}, sobra ${brl(r.saldo)}, aportes na carteira ${brl(aportes[r.mes] ?? 0)}. Por categoria: ${
        r.porCategoria.map((p) => `${nome(p.categoriaId)} ${brl(p.total)}`).join(", ") || "sem despesas"
      }.`,
  );
  const meta = dados.metas.find((m) => m.ativa);
  const guardar = dados.metaGuardar ? escadaGuardar(dados, dados.metaGuardar, mesAtual) : null;
  return [
    `Hoje é ${nomeMes(mesAtual)}.`,
    ...linhas,
    `Médias de 90 dias: receita ${brl(diag.receitaMedia)}, despesa ${brl(diag.despesaMedia)} (essenciais ${brl(diag.fixasMedia)}, variáveis ${brl(diag.variaveisMedia)}), sobra ${brl(diag.sobraMedia)}.`,
    `Renda guardada (média recente): ${rendaGuardadaAtual(dados, mesAtual)}%.`,
    `Maiores gastos variáveis: ${diag.ralos.map((r) => `${nome(r.categoriaId)} ${brl(r.mediaMensal)}/mês`).join(", ") || "nenhum relevante"}.`,
    `Cobranças recorrentes: ${diag.assinaturas.map((a) => `${a.descricao} ${brl(a.valorMensal)}`).join(", ") || "nenhuma"}.`,
    meta ? `Plano de aporte ativo: ${brl(meta.valorMensal)}/mês para ${meta.destino} por ${meta.meses} meses.` : "Sem plano de aporte ativo.",
    guardar && dados.metaGuardar
      ? `Desafio de guardar: alvo ${dados.metaGuardar.alvoPct}% da renda, meta deste mês ${guardar.atual?.alvoPct ?? "-"}%, guardado até agora ${guardar.atual?.guardadoPct ?? 0}%, faltam ${brl(guardar.faltaNoMes)}.`
      : "Sem desafio de guardar.",
  ].join("\n");
}

// Respostas locais para as perguntas mais comuns (sem IA).
export function responderLocal(pergunta: string, dados: FinancasDados, mesAtual: string, aportes: Record<string, number>): string {
  const p = normalizar(pergunta);
  const nome = (id: string) => dados.categorias.find((c) => c.id === id)?.nome ?? "Outros";
  const atual = resumoDoMes(dados, mesAtual);
  const anterior = resumoDoMes(dados, somarMeses(mesAtual, -1));
  const diag = diagnosticar(dados, mesAtual, 90);
  if (!dados.lancamentos.length) return "Ainda não tenho lançamentos seus. Use o botão + para lançar receitas e despesas (falando, por foto ou digitando) e eu passo a responder com os seus números.";

  const categoria = dados.categorias.find((c) => p.includes(normalizar(c.nome)) || p.includes(c.id));
  if (categoria && /gast|pagu|quanto|custo|despes|receb/.test(p)) {
    const agora = atual.porCategoria.find((x) => x.categoriaId === categoria.id)?.total ?? 0;
    const antes = anterior.porCategoria.find((x) => x.categoriaId === categoria.id)?.total ?? 0;
    const media = diag.mediasPorCategoria.find((x) => x.categoriaId === categoria.id)?.media ?? 0;
    const comparacao = antes > 0 ? (agora > antes ? `, ${Math.round((agora / antes - 1) * 100)}% acima do mês passado (${brl(antes)})` : `, abaixo do mês passado (${brl(antes)})`) : "";
    return `Em ${nomeMes(mesAtual).toLowerCase()}, ${categoria.nome} soma ${brl(agora)}${comparacao}. A média dos últimos 3 meses é ${brl(media)} por mês.`;
  }
  if (/maior|mais gast|onde.*gast|para onde|principal/.test(p)) {
    const top = atual.porCategoria.slice(0, 3).map((x) => `${nome(x.categoriaId)} (${brl(x.total)})`).join(", ");
    return top ? `Neste mês, o que mais pesa é: ${top}. Das despesas variáveis, ${diag.ralos[0] ? `${nome(diag.ralos[0].categoriaId)} é o maior ralo, com média de ${brl(diag.ralos[0].mediaMensal)} por mês.` : "nenhuma está fora do padrão."}` : "Ainda não há despesas lançadas neste mês.";
  }
  if (/assinatura|recorrent|mensalidade|streaming/.test(p)) {
    const total = diag.assinaturas.reduce((s, a) => s + a.valorMensal, 0);
    return diag.assinaturas.length ? `Encontrei ${diag.assinaturas.length} cobranças recorrentes: ${diag.assinaturas.map((a) => `${a.descricao} (${brl(a.valorMensal)})`).join(", ")}. Somam ${brl(total)} por mês, ${brl(total * 12)} por ano.` : "Não encontrei cobranças recorrentes nos seus lançamentos.";
  }
  if (/invest|aport|sobra livre|livre para/.test(p)) {
    const aplicado = aportes[mesAtual] ?? 0;
    return `Este mês sobram ${brl(Math.max(0, atual.saldo))} (receitas menos despesas)${aplicado ? ` e você já aplicou ${brl(aplicado)} na carteira` : ""}. Na média dos últimos 3 meses, sobram ${brl(Math.max(0, diag.sobraMedia))} por mês. Eu não indico produtos, mas o Simulador mostra como cada tipo de investimento se comporta.`;
  }
  if (/econom|guardar mais|cortar|reduz|meta|desafio|bater/.test(p)) {
    const cortes = diag.ralos.slice(0, 3).map((r) => `${nome(r.categoriaId)} (${brl(r.mediaMensal)}/mês)`).join(", ");
    const guardar = dados.metaGuardar ? escadaGuardar(dados, dados.metaGuardar, mesAtual) : null;
    return `${guardar ? (guardar.faltaNoMes > 0 ? `Para bater o degrau deste mês faltam ${brl(guardar.faltaNoMes)}. ` : "O degrau deste mês já está garantido. ") : ""}Os gastos com mais espaço para ajuste são ${cortes || "os variáveis"}. Moradia, saúde, educação e contas da casa ficam de fora. Em Plano você vê os cortes sugeridos em reais.`;
  }
  if (/sobr|guard|saldo|resultado|lucro|como estou|resumo|mes/.test(p)) {
    const pct = atual.receitas > 0 ? Math.round((atual.saldo / atual.receitas) * 100) : null;
    return `Em ${nomeMes(mesAtual).toLowerCase()}: entraram ${brl(atual.receitas)}, saíram ${brl(atual.despesas)} e sobraram ${brl(atual.saldo)}${pct !== null ? ` (${pct}% da renda)` : ""}. No mês passado sobraram ${brl(anterior.saldo)}. Sua média recente é guardar ${rendaGuardadaAtual(dados, mesAtual)}% da renda.`;
  }
  return `Posso responder sobre os seus números: quanto gastou em uma categoria, onde mais gasta, quanto sobra para investir, suas assinaturas e como bater a meta. Por exemplo: "quanto gastei com delivery?" Este mês, até agora, sobram ${brl(atual.saldo)}.`;
}
