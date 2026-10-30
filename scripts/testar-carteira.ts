// Confere os cálculos da carteira (extrato → série mensal). Rodar: npm run testar:carteira
import { estadoEm, hojeBR, novoId, serieMensal, type CarteiraDados, type Investimento } from "../src/lib/dominio/carteira";

let falhas = 0;
function igual(nome: string, obtido: number | null, esperado: number, tolerancia = 0.01) {
  const ok = obtido !== null && Math.abs(obtido - esperado) <= tolerancia;
  if (!ok) falhas++;
  console.log(`${ok ? "ok " : "ERRO"} ${nome}: ${obtido} (esperado ${esperado})`);
}

const t = (d: string) => `${d}T12:00:00.000Z`;
const inv: Investimento = {
  id: novoId(), nome: "CDB", classe: "renda_fixa", tipo: "cdb", quantidade: null, criado_em: t("2026-01-01"),
  movimentacoes: [
    { id: novoId(), data: "2026-01-10", tipo: "aplicacao", valor: 1000, quantidade: null, origem: "manual", criado_em: t("2026-01-10") },
    { id: novoId(), data: "2026-01-31", tipo: "saldo", valor: 1010, quantidade: null, origem: "manual", criado_em: t("2026-01-31") },
    { id: novoId(), data: "2026-02-15", tipo: "aplicacao", valor: 500, quantidade: null, origem: "manual", criado_em: t("2026-02-15") },
    { id: novoId(), data: "2026-02-28", tipo: "saldo", valor: 1530, quantidade: null, origem: "manual", criado_em: t("2026-02-28") },
    { id: novoId(), data: "2026-03-10", tipo: "resgate", valor: 510, quantidade: null, origem: "manual", criado_em: t("2026-03-10") },
    { id: novoId(), data: "2026-03-31", tipo: "saldo", valor: 1030, quantidade: null, origem: "manual", criado_em: t("2026-03-31") },
  ],
};
const c: CarteiraDados = { versao: 2, investimentos: [inv], atualizada_em: "" };
const s = serieMensal(c, "2026-03-31");
igual("meses na série", s.length, 3);
igual("jan: rendimento", s[0].rendimento, 10);
igual("fev: dinheiro novo", s[1].fluxo, 500);
igual("fev: rendimento (sem contar o aporte)", s[1].rendimento, 20);
igual("fev: rentabilidade % (Dietz)", s[1].rentabilidade, (20 / (1010 + 250)) * 100, 0.001);
igual("mar: resgate como fluxo negativo", s[2].fluxo, -510);
igual("mar: rendimento", s[2].rendimento, 10);
const e = estadoEm(inv, "2026-03-31");
igual("custo após resgate proporcional", e.aplicado, 1500 * (1 - 510 / 1530));
igual("saldo final", e.saldo, 1030);
const futura = serieMensal(c, hojeBR());
igual("série vai até o mês atual", futura.at(-1)!.mes === hojeBR().slice(0, 7) ? 1 : 0, 1);

if (falhas) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log("\nCálculos da carteira OK");
