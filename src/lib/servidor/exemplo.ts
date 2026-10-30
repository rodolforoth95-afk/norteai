import "server-only";
import { hojeBR, novoId, type CarteiraDados, type Investimento, type Movimentacao } from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";

// Carteira fictícia do modo de teste: 8 meses de extrato, com aplicações mensais,
// um resgate e um mês negativo na bolsa, para exercitar todos os gráficos.

type Modelo = {
  nome: string;
  classe: Classe;
  tipo: string;
  inicial: number;
  quantidade: number | null;
  // Rendimento de cada mês, em %, do mais antigo ao mais recente.
  meses: number[];
  aportes?: Record<number, number>; // mês (0 = primeiro) → valor aplicado
  resgates?: Record<number, number>;
};

const MODELOS: Modelo[] = [
  { nome: "Tesouro Selic 2029", classe: "renda_fixa", tipo: "tesouro-selic", inicial: 5000, quantidade: null, meses: [1.05, 1.08, 1.1, 1.07, 1.12, 1.09, 1.08, 1.0], aportes: { 2: 500, 4: 500, 6: 500 } },
  { nome: "CDB 110% CDI", classe: "renda_fixa", tipo: "cdb", inicial: 3500, quantidade: null, meses: [1.15, 1.18, 1.2, 1.17, 1.22, 1.19, 1.18, 1.1] },
  { nome: "LCI 95% CDI", classe: "renda_fixa", tipo: "lci-lca", inicial: 1500, quantidade: null, meses: [0.98, 1.0, 1.02, 0.99, 1.03, 1.01, 1.0, 0.95] },
  { nome: "BOVA11", classe: "acoes_etfs", tipo: "etfs-indice", inicial: 2000, quantidade: 12, meses: [2.1, -1.4, 3.2, -4.8, 1.9, 2.6, -2.2, 1.4], aportes: { 3: 400, 5: 400 } },
  { nome: "PETR4", classe: "acoes_etfs", tipo: "acoes", inicial: 1100, quantidade: 30, meses: [3.5, -2.1, 4.4, -6.2, 0.8, 5.1, -3.4, 2.2] },
  { nome: "HGLG11", classe: "fiis", tipo: "fiis", inicial: 1200, quantidade: 8, meses: [0.9, 1.4, -0.6, -1.8, 1.2, 0.7, 1.1, 0.4] },
  { nome: "IVVB11", classe: "exterior", tipo: "exterior", inicial: 1400, quantidade: 4, meses: [1.8, 2.4, -1.1, -2.9, 3.1, 1.6, 2.0, 0.9] },
  { nome: "Bitcoin", classe: "cripto", tipo: "bitcoin", inicial: 600, quantidade: null, meses: [8.0, -6.5, 12.1, -15.2, 4.4, 9.8, -7.1, 3.3], resgates: { 6: 150 } },
];

function dataDoMes(base: Date, deslocamento: number, dia: number) {
  const d = new Date(base.getFullYear(), base.getMonth() + deslocamento, dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function carteiraExemplo(): CarteiraDados {
  const hoje = hojeBR();
  const [a, m] = hoje.split("-").map(Number);
  const inicio = new Date(a, m - 1 - 7, 1);
  let relogio = Date.now() - 1_000_000;
  const criado = () => new Date(relogio++).toISOString();

  const investimentos: Investimento[] = MODELOS.map((mod) => {
    const movs: Movimentacao[] = [];
    const add = (tipo: Movimentacao["tipo"], data: string, valor: number) =>
      movs.push({ id: novoId(), data, tipo, valor: Math.round(valor * 100) / 100, quantidade: mod.quantidade, origem: "exemplo", criado_em: criado() });

    add("aplicacao", dataDoMes(inicio, 0, 5), mod.inicial);
    let saldo = mod.inicial;
    mod.meses.forEach((r, i) => {
      if (mod.aportes?.[i]) {
        add("aplicacao", dataDoMes(inicio, i, 10), mod.aportes[i]);
        saldo += mod.aportes[i];
      }
      if (mod.resgates?.[i]) {
        add("resgate", dataDoMes(inicio, i, 12), mod.resgates[i]);
        saldo -= mod.resgates[i];
      }
      saldo *= 1 + r / 100;
      // Último mês: atualização com a data de hoje; os outros, no fim do mês.
      const data = i === mod.meses.length - 1 ? hoje : dataDoMes(inicio, i + 1, 0);
      add("saldo", data > hoje ? hoje : data, saldo);
    });
    return { id: novoId(), nome: mod.nome, classe: mod.classe, tipo: mod.tipo, quantidade: mod.quantidade, criado_em: criado(), movimentacoes: movs };
  });

  return { versao: 2, investimentos, atualizada_em: new Date().toISOString() };
}
