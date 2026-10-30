import type { Classe, Risco } from "@/lib/dominio/tipos";
import { AULAS_MODULOS } from "./aulas-modulos";

// Conteúdos educativos (Tela 6). Nunca citam empresas, fundos ou corretoras como indicação.
// Próxima fase: mover para a tabela `conteudo` do banco, editável sem mexer no código.

export type Secao = { titulo: string; paragrafos?: string[]; passos?: string[] };
export type FormaAcesso = { nome: string; texto: string; atencao: string };

export type Ilustracao = "juros" | "candles" | "tendencia" | "suporte" | "medias" | "volume" | "drawdown";

export type Aula = {
  slug: string;
  classe?: Classe;
  titulo: string;
  categoria: string;
  risco?: Risco;
  minutos: number;
  video?: string;
  ilustracao?: Ilustracao;
  secoes: Secao[];
  formas: FormaAcesso[];
};

const AULAS_CLASSES: Aula[] = [
  {
    slug: "renda_fixa",
    classe: "renda_fixa",
    titulo: "Renda fixa: o ponto de partida",
    categoria: "Renda fixa",
    risco: "Baixo",
    minutos: 5,
    video: "cdb",
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Na renda fixa você empresta dinheiro para alguém (governo, banco ou empresa) e recebe juros por isso. As regras de rendimento são combinadas na hora da aplicação.",
          "É a base da reserva de emergência e das metas de curto prazo, porque oscila pouco e muitas opções permitem resgatar rápido.",
        ],
      },
      {
        titulo: "Como o rendimento é definido",
        paragrafos: [
          "Pós-fixado: acompanha um indicador, como o CDI ou a Selic. Prefixado: a taxa é fechada na compra. Atrelado à inflação: rende o IPCA mais uma taxa.",
        ],
      },
      {
        titulo: "Riscos",
        paragrafos: [
          "Risco de crédito (o emissor não pagar), de liquidez (não conseguir resgatar antes do prazo) e de mercado (títulos prefixados e IPCA+ oscilam se vendidos antes do vencimento).",
          "CDB, LCI e LCA têm garantia do FGC até R$ 250 mil por CPF e instituição. Títulos públicos são garantidos pelo Tesouro Nacional. Debêntures, CRI e CRA não têm FGC.",
        ],
      },
    ],
    formas: [
      { nome: "Tesouro Direto", texto: "Títulos públicos comprados pela corretora ou pelo app do Tesouro.", atencao: "Taxa de custódia da B3 e IR regressivo." },
      { nome: "Títulos bancários (CDB, LCI, LCA)", texto: "Oferecidos por bancos e corretoras.", atencao: "Confira liquidez, prazo e o limite do FGC." },
      { nome: "Crédito privado (debêntures, CRI, CRA)", texto: "Empréstimos para empresas, com taxas maiores.", atencao: "Sem FGC e com liquidez baixa." },
    ],
  },
  {
    slug: "acoes_etfs",
    classe: "acoes_etfs",
    titulo: "Ações: como comprar sua primeira ação",
    categoria: "Renda variável",
    risco: "Alto",
    minutos: 7,
    video: "acoes",
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Uma ação é um pedaço de uma empresa. Quem tem ações pode ganhar com a valorização e receber parte do lucro (dividendos), mas também pode perder se o preço cair.",
        ],
      },
      {
        titulo: "Exemplo para entender o código",
        paragrafos: [
          "Usado só para explicar, não é indicação: PETR4. \"PETR\" identifica a Petrobras e o número indica o tipo: 3 = ordinária (ON, com direito a voto), 4 = preferencial (PN, com preferência nos dividendos), 11 = units (pacotes de ações).",
        ],
      },
      {
        titulo: "Passo a passo",
        passos: [
          "Abra conta numa corretora de valores. É gratuito na maioria delas e feito pelo app da corretora (os documentos você envia lá, não aqui).",
          "Transfira o dinheiro por Pix ou TED para a sua conta na corretora.",
          "Busque o código da ação no app ou no home broker da corretora.",
          "Escolha a quantidade. O lote padrão é de 100 ações, mas no mercado fracionário você compra a partir de 1 ação: basta usar o código com \"F\" no final (por exemplo, PETR4F).",
          "Envie a ordem: \"a mercado\" (pelo preço do momento) ou \"limitada\" (só executa até o preço que você definir). As ordens são executadas durante o pregão, em dias úteis.",
          "Liquidação: as ações e o débito do dinheiro aparecem na sua conta em até 2 dias úteis (D+2).",
          "Acompanhe pela corretora e pela Área do Investidor da B3. Importe o extrato aqui para ver o diagnóstico da sua carteira.",
        ],
      },
      {
        titulo: "Custos a observar",
        paragrafos: [
          "Taxa de corretagem (muitas corretoras cobram zero), taxas da B3 (pequenas, por operação) e imposto de renda sobre o lucro na venda.",
          "Com o mercado fracionário, dá para começar com o preço de 1 ação: [cotação do dia].",
        ],
      },
    ],
    formas: [
      { nome: "Ações individuais", texto: "Compra direta de empresas pela corretora.", atencao: "Exige estudo e diversificação." },
      { nome: "ETFs de índice", texto: "Uma cesta de ações numa única cota.", atencao: "Há taxa de administração." },
      { nome: "Fundos de ações", texto: "Um gestor escolhe as ações.", atencao: "Compare taxas e aplicação mínima." },
    ],
  },
  {
    slug: "fiis",
    classe: "fiis",
    titulo: "Fundos imobiliários (FIIs)",
    categoria: "Renda variável",
    risco: "Médio",
    minutos: 5,
    video: "fiis",
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Um FII reúne o dinheiro de muitos investidores para comprar imóveis (shoppings, galpões, escritórios) ou títulos imobiliários. Você compra cotas na bolsa, como uma ação.",
        ],
      },
      {
        titulo: "Rendimentos",
        paragrafos: [
          "Muitos FIIs distribuem rendimentos todo mês. Para pessoa física, esses rendimentos hoje são isentos de IR, desde que o fundo e o investidor cumpram algumas condições. O lucro na venda das cotas é tributado.",
        ],
      },
      {
        titulo: "Riscos",
        paragrafos: [
          "A cota oscila na bolsa. Imóveis vazios (vacância), inquilinos que não pagam e concentração em poucos imóveis afetam os rendimentos. Não há FGC.",
        ],
      },
    ],
    formas: [
      { nome: "Cotas na bolsa", texto: "Compradas pela corretora, em dias úteis.", atencao: "Diversifique entre tipos de fundo." },
      { nome: "Fundos de fundos", texto: "Um FII que investe em vários outros FIIs.", atencao: "Há uma camada extra de taxa." },
    ],
  },
  {
    slug: "multimercado",
    classe: "multimercado",
    titulo: "Fundos multimercado",
    categoria: "Renda variável",
    risco: "Médio",
    minutos: 4,
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Fundos em que um gestor pode investir em juros, ações, câmbio e outros mercados ao mesmo tempo, mudando a estratégia conforme o cenário.",
        ],
      },
      {
        titulo: "Pontos de atenção",
        paragrafos: [
          "Taxa de administração e, às vezes, taxa de performance. Prazo de resgate que pode levar dias ou semanas. Resultado que depende muito do gestor.",
        ],
      },
    ],
    formas: [
      { nome: "Plataformas de fundos", texto: "Disponíveis em bancos e corretoras.", atencao: "Leia a lâmina do fundo: taxas, prazo e estratégia." },
    ],
  },
  {
    slug: "cripto",
    classe: "cripto",
    titulo: "Criptomoedas",
    categoria: "Reserva de valor",
    risco: "Muito alto",
    minutos: 6,
    video: "cripto",
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Criptomoedas são moedas digitais que funcionam numa rede de computadores (a blockchain), sem um banco central ou governo emitindo e controlando. As transações ficam registradas de forma pública e difícil de alterar.",
        ],
      },
      {
        titulo: "De onde vem o valor (o \"lastro\")",
        paragrafos: [
          "A maioria das criptomoedas não tem lastro em um bem físico nem garantia de governo. O preço vem da oferta e da procura, da escassez programada (o bitcoin, por exemplo, tem limite de 21 milhões de unidades), do uso da rede e da confiança das pessoas.",
          "As stablecoins são uma exceção: buscam acompanhar uma moeda, como o dólar, e dependem de o emissor manter as reservas.",
        ],
      },
      {
        titulo: "Riscos",
        paragrafos: [
          "O preço pode cair mais da metade em poucos meses; não tem a garantia do FGC; há muitos golpes com promessas de lucro fácil; quem perde a senha ou a chave da carteira digital pode perder o acesso ao dinheiro.",
        ],
      },
    ],
    formas: [
      { nome: "Corretora de criptomoedas (exchange)", texto: "Compra direta da moeda.", atencao: "Prefira empresas autorizadas a funcionar pelo Banco Central e ative a verificação em duas etapas." },
      { nome: "ETFs de cripto na B3", texto: "Comprados pela corretora de valores, como uma ação, sem precisar cuidar de carteira digital.", atencao: "Há taxa de administração." },
      { nome: "Fundos de investimento com cripto", texto: "Um gestor profissional cuida da alocação.", atencao: "Compare taxas e aplicação mínima." },
      { nome: "Apps de bancos e corretoras que oferecem cripto", texto: "Praticidade.", atencao: "Veja se você pode transferir as moedas para fora do app." },
    ],
  },
  {
    slug: "exterior",
    classe: "exterior",
    titulo: "Investimentos no exterior",
    categoria: "Exterior",
    risco: "Alto",
    minutos: 4,
    secoes: [
      {
        titulo: "O que é",
        paragrafos: [
          "Investir em empresas, índices e títulos de outros países. Além do desempenho dos ativos, o resultado depende da variação do dólar ou de outra moeda.",
        ],
      },
      {
        titulo: "Por que as pessoas fazem isso",
        paragrafos: [
          "Para diversificar fora da economia brasileira e ter acesso a setores pouco presentes na bolsa local.",
        ],
      },
    ],
    formas: [
      { nome: "BDRs", texto: "Recibos de ações estrangeiras negociados na B3.", atencao: "Há regras de IR próprias e variação cambial." },
      { nome: "ETFs internacionais na B3", texto: "Cestas de ativos de fora, negociadas em reais.", atencao: "Taxa de administração e câmbio." },
      { nome: "Conta em corretora no exterior", texto: "Acesso direto a bolsas de outros países.", atencao: "Câmbio, declaração no IR e custos de envio." },
    ],
  },
  {
    slug: "diversificacao",
    titulo: "Concentração e diversificação",
    categoria: "Fundamentos",
    risco: "Médio",
    minutos: 3,
    secoes: [
      {
        titulo: "O que é concentração",
        paragrafos: [
          "Quando um único investimento ou setor ocupa uma fatia grande da carteira, um problema nele afeta muito o seu patrimônio. Como referência educacional, um ativo acima de 20% já merece atenção.",
        ],
      },
      {
        titulo: "Como pensar a diversificação",
        paragrafos: [
          "Entre classes (renda fixa, ações, FIIs), dentro de cada classe (vários emissores e empresas) e entre países. O objetivo não é ter muitos ativos, e sim não depender de um só.",
        ],
      },
    ],
    formas: [],
  },
];

export const AULAS: Aula[] = [...AULAS_CLASSES, ...AULAS_MODULOS];

export function aulaPorSlug(slug: string) {
  return AULAS.find((a) => a.slug === slug);
}
