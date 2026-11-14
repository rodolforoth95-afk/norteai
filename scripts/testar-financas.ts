// Confere a leitura de frases, o aprendizado e o plano de economia. Rodar: npm run testar:financas
import { responderLocal } from "../src/lib/dominio/assistente-financas";
import { alvoDoMes, aprender, diagnosticar, dreDosMeses, escadaGuardar, evolucaoFinanceira, rendaGuardadaAtual, exemploFinancas, financasVazias, interpretarFrase, lerTextoComprovante, planejar, resumoDoMes, sugerirCategoria } from "../src/lib/dominio/financas";

let falhas = 0;
const ok = (nome: string, cond: boolean, info: unknown = "") => {
  if (!cond) falhas++;
  console.log(`${cond ? "ok  " : "ERRO"} ${nome} ${cond ? "" : JSON.stringify(info)}`);
};
const hoje = "2026-11-13";

const a = interpretarFrase("Gastei 85 reais no almoço hoje no débito", hoje);
ok("despesa 85 débito hoje", a.tipo === "despesa" && a.valor === 85 && a.meio === "debito" && a.data === hoje, a);
const b = interpretarFrase("Recebi 5 mil de dividendo", hoje);
ok("receita 5 mil", b.tipo === "receita" && b.valor === 5000, b);
const c = interpretarFrase("paguei 1.200,50 de aluguel ontem no pix", hoje);
ok("1.200,50 ontem pix", c.valor === 1200.5 && c.data === "2026-11-12" && c.meio === "pix", c);
const d = interpretarFrase("comprei um tênis de 600 em 3x no crédito", hoje);
ok("600 em 3x crédito", d.valor === 600 && d.parcelas === 3 && d.meio === "credito", d);
const e = interpretarFrase("uber de 32,90 dia 5", hoje);
ok("32,90 dia 5", e.valor === 32.9 && e.data === "2026-11-05", e);

const dados = financasVazias();
ok("sugere transporte para posto", sugerirCategoria("POSTO IPIRANGA 1234", "despesa", dados).categoriaId === "transporte");
dados.regras = aprender(dados.regras, "Padaria do Zé", "alimentacao");
const s = sugerirCategoria("PADARIA DO ZE LTDA", "despesa", dados);
ok("aprende padaria do zé → restaurantes", s.categoriaId === "alimentacao" && s.aprendida, s);

let n = 0;
dados.lancamentos = exemploFinancas(hoje, () => `id${n++}`);
const r = resumoDoMes(dados, "2026-10");
ok("mês de exemplo tem receitas e despesas", r.receitas > 7000 && r.despesas > 3000, r);
const diag = diagnosticar(dados, "2026-11", 90);
ok("diagnóstico encontra delivery como ralo", diag.ralos.some((x) => x.categoriaId === "delivery"), diag.ralos);
const plano = planejar(diag, diag.sobraMedia + 600, 6);
ok("plano corta só variáveis", plano.cortes.every((x) => !["moradia", "saude", "contas", "mercado", "educacao", "dividas"].includes(x.categoriaId)), plano.cortes);
ok("plano atinge meta possível", plano.atingivel, plano);
console.log(`\nsobra média ${diag.sobraMedia} · ralos ${diag.ralos.map((x) => x.categoriaId).join(", ")} · cortes ${plano.cortes.map((x) => `${x.categoriaId} -${x.percentual}%`).join(", ")}`);
if (falhas) process.exit(1);
// Comprovantes lidos por OCR
const cupom = lerTextoComprovante(`SUPERMERCADO BOM PRECO LTDA
CNPJ 12.345.678/0001-90
RUA DAS FLORES, 100
CUPOM FISCAL ELETRONICO - SAT
ARROZ 5KG            27,90
FEIJAO 1KG            8,49
SUBTOTAL             36,39
DESCONTO              1,39
TOTAL R$             35,00
CARTAO DEBITO        35,00
10/11/2026 14:32`, hoje);
ok("cupom: total 35, débito, data, nome", cupom.valor === 35 && cupom.meio === "debito" && cupom.data === "2026-11-10" && cupom.estabelecimento === "Supermercado Bom Preco", cupom);
const pix = lerTextoComprovante(`Comprovante de transferência
Pix enviado
Valor
R$ 1.250,00
Para
Joana Imóveis
Data 12/11/2026`, hoje);
ok("pix: 1250, pix, destinatário", pix.valor === 1250 && pix.meio === "pix" && pix.estabelecimento === "Joana Imóveis" && pix.data === "2026-11-12", pix);
const futuro = lerTextoComprovante("LOJA X\nTOTAL 10,00\nVencimento 20/12/2026", hoje);
ok("data futura ignorada", futuro.data === hoje && futuro.valor === 10, futuro);

// DRE
{
  const dados = { ...financasVazias(), lancamentos: exemploFinancas(hoje, () => Math.random().toString(36).slice(2)) };
  const meses = ["2026-09", "2026-10"];
  const dre = dreDosMeses(dados, meses, { "2026-10": 500 });
  const linha = (id: string) => dre.find((l) => l.id === id)!;
  const r = resumoDoMes(dados, "2026-10");
  ok("DRE receitas = resumo", Math.abs(linha("receitas").valores[1] - r.receitas) < 0.01, linha("receitas"));
  ok("DRE resultado = saldo", Math.abs(linha("resultado").valores[1] - r.saldo) < 0.01, [linha("resultado").valores, r.saldo]);
  ok("DRE essenciais + variáveis = despesas", Math.abs(linha("essenciais").valores[1] + linha("variaveis").valores[1] - r.despesas) < 0.01);
  ok("DRE caixa = resultado − aportes", Math.abs(linha("caixa").valores[1] - (r.saldo - 500)) < 0.01);
  ok("DRE itens de receita", dre.some((l) => l.categoriaId === "salario"));
}

// Evolução
{
  const dados = { ...financasVazias(), lancamentos: exemploFinancas(hoje, () => Math.random().toString(36).slice(2)) };
  const ev = evolucaoFinanceira(dados, "2026-11", { "2026-10": 500 });
  ok("evolução: 6 meses", ev.meses.length === 6, ev.meses.length);
  ok("evolução: pontuação 0–100", ev.pontuacao >= 0 && ev.pontuacao <= 100, ev.pontuacao);
  ok("evolução: soma das partes", ev.partes.reduce((s, x) => s + x.pontos, 0) === ev.pontuacao, ev.partes);
  const ult = ev.meses.at(-1)!;
  ok("evolução: acumulado = soma dos saldos", Math.abs(ult.acumulado - ev.meses.reduce((s, m) => s + m.saldo, 0)) < 0.05);
  const vazio = evolucaoFinanceira(financasVazias(), "2026-11", {});
  ok("evolução sem dados", vazio.pontuacao <= 8 && vazio.taxaMedia === null, vazio);
  console.log(`pontuação exemplo ${ev.pontuacao} (${ev.nivel}) · taxa média ${ev.taxaMedia}% · variáveis ${ev.variacaoVariaveis}%`);
}

// Desafio de guardar e chat local
{
  const dados = { ...financasVazias(), lancamentos: exemploFinancas(hoje, () => Math.random().toString(36).slice(2)) };
  const atual = rendaGuardadaAtual(dados, "2026-11");
  ok("renda guardada atual entre 0 e 100", atual >= 0 && atual <= 100, atual);
  const meta = { alvoPct: 45, ritmo: "agressivo" as const, inicioPct: 30, inicio: "2026-11", criada_em: "" };
  ok("alvo do primeiro mês = início + passo", alvoDoMes(meta, "2026-11") === 34, alvoDoMes(meta, "2026-11"));
  ok("alvo nunca passa do final", alvoDoMes(meta, "2027-12") === 45);
  const esc = escadaGuardar(dados, meta, "2026-11");
  ok("escada termina no alvo", esc.degraus.at(-1)!.alvoPct === 45 && esc.atual?.estado === "andamento", esc.degraus.map((d) => d.alvoPct));
  ok("escada tem impedimentos só variáveis", esc.impedimentos.every((i) => !["moradia", "saude", "contas"].includes(i.categoriaId)), esc.impedimentos);
  const r1 = responderLocal("quanto gastei com delivery?", dados, "2026-11", {});
  ok("chat: delivery", r1.includes("Delivery"), r1);
  const r2 = responderLocal("quais minhas assinaturas", dados, "2026-11", {});
  ok("chat: assinaturas", r2.includes("Netflix"), r2);
  const r3 = responderLocal("como estou este mês?", dados, "2026-11", {});
  ok("chat: resumo", r3.includes("sobraram"), r3);
}

if (falhas) {
  console.log(`${falhas} falha(s)`);
  process.exit(1);
}
console.log("Finanças OK");
