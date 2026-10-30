// Confere as carteiras de exemplo e mostra uma simulação. Rodar: npm run testar:simulador
import { CARTEIRAS, conferirCarteiras, simular, type Indicadores } from "../src/lib/dominio/simulador";

const ind: Indicadores = {
  selic: 13.75, cdi: 13.65, ipca12m: 4.58, poupancaMes: 0.67, jurosReal: 7,
  dataJuros: null, dataIpca: null,
  recente: { acoes3m: -5.8, exterior3m: 6.7, fiis3m: -3.6, bitcoin3m: -20, bitcoin12m: -28, bitcoinPreco: 416000 },
  faltando: [], atualizadoEm: new Date().toISOString(),
};

const problemas = conferirCarteiras();
if (problemas.length) {
  console.error("Problemas nas carteiras:\n" + problemas.join("\n"));
  process.exit(1);
}
console.log("Carteiras OK (somam 100% e respeitam as faixas)\n");

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
for (const [estilo, lista] of Object.entries(CARTEIRAS)) {
  for (const c of lista) {
    const s = simular(c, { valor: 10000, aporte: 500, meses: 60 }, ind);
    console.log(
      `${estilo.padEnd(12)} ${c.nome.padEnd(28)} taxa ${s.taxaEsperada.toFixed(1)}% vol ${s.vol.toFixed(1)}% | ` +
        `investido ${brl(s.investido)} base ${brl(s.finalBase)} [${brl(s.finalPessimista)} – ${brl(s.finalOtimista)}] ` +
        `poup ${brl(s.finalPoupanca)} IR ${brl(s.impostoEstimado)} real ${brl(s.finalReal)} crise ${s.quedaCrisePct.toFixed(1)}% ` +
        `perda1a ${s.chancePerdaUmAno.toFixed(0)}% 3m ${s.recente3m?.toFixed(1)}%`,
    );
  }
}
