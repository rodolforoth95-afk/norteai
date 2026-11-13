// Confere a leitura de frases, o aprendizado e o plano de economia. Rodar: npm run testar:financas
import { aprender, diagnosticar, exemploFinancas, financasVazias, interpretarFrase, planejar, resumoDoMes, sugerirCategoria } from "../src/lib/dominio/financas";

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
console.log("Finanças OK");
