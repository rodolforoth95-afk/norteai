import type { Classe, Estilo, Risco } from "./tipos";

// Classes de ativos e faixas de referência por estilo (seção 6.2, ajustadas).
// Valores provisórios: validar com um especialista antes do lançamento.

export type InfoClasse = {
  nome: string;
  grupo: "Renda fixa" | "Renda variável" | "Reserva de valor" | "Exterior";
  risco: Risco;
  descricao: string;
  cor: string;
};

export const CLASSES: Record<Classe, InfoClasse> = {
  renda_fixa: {
    nome: "Renda fixa",
    grupo: "Renda fixa",
    risco: "Baixo",
    descricao: "Você empresta para governo, bancos ou empresas e recebe juros. É a base da reserva e das metas curtas.",
    cor: "#2D5BFF",
  },
  acoes_etfs: {
    nome: "Ações e ETFs",
    grupo: "Renda variável",
    risco: "Alto",
    descricao: "Pedaços de empresas, ou cestas delas (ETFs). Oscilam mais e pedem prazo longo.",
    cor: "#FF8A3D",
  },
  fiis: {
    nome: "Fundos imobiliários",
    grupo: "Renda variável",
    risco: "Médio",
    descricao: "Cotas de imóveis e títulos imobiliários que costumam pagar rendimentos todo mês.",
    cor: "#38BDF8",
  },
  multimercado: {
    nome: "Fundos multimercado",
    grupo: "Renda variável",
    risco: "Médio",
    descricao: "Fundos que misturam juros, ações e câmbio. Um gestor decide onde investir.",
    cor: "#8FA8FF",
  },
  cripto: {
    nome: "Criptomoedas",
    grupo: "Reserva de valor",
    risco: "Muito alto",
    descricao: "Moedas digitais sem banco central por trás. Podem subir e cair muito em pouco tempo.",
    cor: "#F5A524",
  },
  exterior: {
    nome: "Investimentos no exterior",
    grupo: "Exterior",
    risco: "Alto",
    descricao: "Empresas e títulos de outros países, que expõem o dinheiro ao dólar ou a outras moedas.",
    cor: "#FFB27A",
  },
};

export const ORDEM_CLASSES: Classe[] = ["renda_fixa", "acoes_etfs", "fiis", "multimercado", "cripto", "exterior"];

export type Faixa = { min: number; max: number };

export const FAIXAS: Record<Estilo, Record<Classe, Faixa>> = {
  Cauteloso: {
    renda_fixa: { min: 90, max: 100 },
    acoes_etfs: { min: 0, max: 0 },
    fiis: { min: 0, max: 5 },
    multimercado: { min: 0, max: 5 },
    cripto: { min: 0, max: 0 },
    exterior: { min: 0, max: 0 },
  },
  Equilibrado: {
    renda_fixa: { min: 50, max: 70 },
    acoes_etfs: { min: 15, max: 30 },
    fiis: { min: 5, max: 15 },
    multimercado: { min: 0, max: 10 },
    cripto: { min: 0, max: 3 },
    exterior: { min: 0, max: 10 },
  },
  Ousado: {
    renda_fixa: { min: 25, max: 45 },
    acoes_etfs: { min: 25, max: 45 },
    fiis: { min: 5, max: 15 },
    multimercado: { min: 5, max: 15 },
    cripto: { min: 3, max: 8 },
    exterior: { min: 5, max: 15 },
  },
};

export const ESTILOS: Estilo[] = ["Cauteloso", "Equilibrado", "Ousado"];

export const INFO_ESTILO: Record<Estilo, { risco: string; frase: string; cor: string }> = {
  Cauteloso: {
    risco: "Risco baixo",
    frase: "Você prioriza segurança e previsibilidade. Faz sentido conhecer primeiro a renda fixa.",
    cor: "#38BDF8",
  },
  Equilibrado: {
    risco: "Risco médio",
    frase: "Você aceita algumas oscilações em troca de mais potencial no longo prazo.",
    cor: "#2D5BFF",
  },
  Ousado: {
    risco: "Risco alto",
    frase: "Você tolera quedas fortes no caminho e pensa no longo prazo.",
    cor: "#FF8A3D",
  },
};

// Tipos de investimento exibidos por estilo. São categorias de produto, nunca ativos
// específicos, emissores ou corretoras (linha educacional da CVM).
export type TipoInvestimento = {
  id: string;
  nome: string;
  classe: Classe;
  risco: Risco;
  estilos: Estilo[];
  resumo: string;
  liquidez: string;
  garantia: string;
  video?: string;
};

export const TIPOS: TipoInvestimento[] = [
  {
    id: "cdb",
    nome: "CDB",
    classe: "renda_fixa",
    risco: "Baixo",
    estilos: ["Cauteloso", "Equilibrado", "Ousado"],
    resumo: "Empréstimo para um banco, que devolve com juros. Muitos rendem um percentual do CDI.",
    liquidez: "Diária ou no vencimento",
    garantia: "FGC até R$ 250 mil por CPF e instituição",
    video: "cdb",
  },
  {
    id: "tesouro-selic",
    nome: "Tesouro Selic",
    classe: "renda_fixa",
    risco: "Baixo",
    estilos: ["Cauteloso", "Equilibrado", "Ousado"],
    resumo: "Título público que acompanha a taxa Selic. Muito usado para reserva de emergência.",
    liquidez: "Diária (D+0 em dias úteis)",
    garantia: "Tesouro Nacional",
    video: "tesouro",
  },
  {
    id: "lci-lca",
    nome: "LCI e LCA",
    classe: "renda_fixa",
    risco: "Baixo",
    estilos: ["Cauteloso", "Equilibrado", "Ousado"],
    resumo: "Parecidas com o CDB, mas ligadas a imóveis ou agronegócio. Para pessoa física, hoje são isentas de IR.",
    liquidez: "Costuma ter carência",
    garantia: "FGC até R$ 250 mil por CPF e instituição",
    video: "cdb",
  },
  {
    id: "tesouro-prefixado",
    nome: "Tesouro Prefixado",
    classe: "renda_fixa",
    risco: "Baixo",
    estilos: ["Cauteloso", "Equilibrado", "Ousado"],
    resumo: "Você sabe a taxa na compra. Levando até o vencimento, recebe o combinado; vender antes pode dar ganho ou perda.",
    liquidez: "Diária, a preço de mercado",
    garantia: "Tesouro Nacional",
    video: "tesouro",
  },
  {
    id: "tesouro-ipca",
    nome: "Tesouro IPCA+",
    classe: "renda_fixa",
    risco: "Médio",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Rende a inflação mais uma taxa. Pensado para metas longas, como aposentadoria. Oscila bastante no caminho.",
    liquidez: "Diária, a preço de mercado",
    garantia: "Tesouro Nacional",
    video: "tesouro",
  },
  {
    id: "debentures",
    nome: "Debêntures, CRI e CRA",
    classe: "renda_fixa",
    risco: "Médio",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Empréstimos para empresas. Pagam mais que títulos de banco porque o risco é maior.",
    liquidez: "Baixa: venda antes do prazo pode ser difícil",
    garantia: "Sem FGC",
  },
  {
    id: "fiis",
    nome: "Fundos imobiliários (FIIs)",
    classe: "fiis",
    risco: "Médio",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Cotas de shoppings, galpões, escritórios ou títulos imobiliários, negociadas na bolsa.",
    liquidez: "Na bolsa, em dias úteis",
    garantia: "Sem FGC",
    video: "fiis",
  },
  {
    id: "etfs-indice",
    nome: "ETFs de índice",
    classe: "acoes_etfs",
    risco: "Alto",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Uma cesta de ações em uma única cota. Diversifica com pouco dinheiro.",
    liquidez: "Na bolsa, em dias úteis",
    garantia: "Sem FGC",
    video: "acoes",
  },
  {
    id: "acoes",
    nome: "Ações",
    classe: "acoes_etfs",
    risco: "Alto",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Pedaços de empresas listadas na bolsa. Ganho com valorização e dividendos.",
    liquidez: "Na bolsa, em dias úteis",
    garantia: "Sem FGC",
    video: "acoes",
  },
  {
    id: "multimercado",
    nome: "Fundos multimercado",
    classe: "multimercado",
    risco: "Médio",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Um gestor mistura juros, ações, câmbio e outros mercados. Atenção às taxas.",
    liquidez: "Varia de dias a meses",
    garantia: "Sem FGC",
  },
  {
    id: "exterior",
    nome: "BDRs e ETFs internacionais",
    classe: "exterior",
    risco: "Alto",
    estilos: ["Equilibrado", "Ousado"],
    resumo: "Acesso a empresas e índices de outros países pela bolsa brasileira, com exposição ao dólar.",
    liquidez: "Na bolsa, em dias úteis",
    garantia: "Sem FGC",
  },
  {
    id: "bitcoin",
    nome: "Bitcoin",
    classe: "cripto",
    risco: "Muito alto",
    estilos: ["Ousado"],
    resumo: "A primeira criptomoeda, com oferta limitada a 21 milhões. Pode cair mais de 50% em meses.",
    liquidez: "24 horas, em corretoras de cripto",
    garantia: "Sem FGC",
    video: "cripto",
  },
  {
    id: "etfs-cripto",
    nome: "ETFs de cripto",
    classe: "cripto",
    risco: "Muito alto",
    estilos: ["Ousado"],
    resumo: "Exposição a criptomoedas pela bolsa, sem precisar cuidar de carteira digital.",
    liquidez: "Na bolsa, em dias úteis",
    garantia: "Sem FGC",
    video: "cripto",
  },
  {
    id: "outras-cripto",
    nome: "Ethereum e outras criptos",
    classe: "cripto",
    risco: "Muito alto",
    estilos: ["Ousado"],
    resumo: "Redes com usos diferentes do Bitcoin. Ainda mais voláteis e com muitos projetos que somem.",
    liquidez: "24 horas, em corretoras de cripto",
    garantia: "Sem FGC",
    video: "cripto",
  },
];

export function tiposDoEstilo(estilo: Estilo) {
  return TIPOS.filter((t) => t.estilos.includes(estilo));
}

export const COR_RISCO: Record<Risco, string> = {
  Baixo: "text-menta border-menta/40 bg-menta/10",
  Médio: "text-ciano border-ciano/40 bg-ciano/10",
  Alto: "text-rosa border-rosa/40 bg-rosa/10",
  "Muito alto": "text-ambar border-ambar/40 bg-ambar/10",
};
