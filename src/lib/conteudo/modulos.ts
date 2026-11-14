// Trilhas de aprendizado: cada módulo agrupa aulas e termina com um quiz (+coins).

export type PerguntaQuiz = { pergunta: string; opcoes: string[]; correta: number; explicacao: string };

export type Modulo = {
  slug: string;
  titulo: string;
  descricao: string;
  icone: "base" | "carteira" | "acoes" | "grafico" | "escudo" | "lupa";
  aulas: string[];
  quiz: PerguntaQuiz[];
};

export const MODULOS: Modulo[] = [
  {
    slug: "fundamentos",
    titulo: "Fundamentos do dinheiro",
    descricao: "Juros compostos, inflação, reserva e metas.",
    icone: "base",
    aulas: ["juros-compostos", "inflacao", "reserva-emergencia", "objetivos-e-prazos"],
    quiz: [
      { pergunta: "O que diferencia os juros compostos dos simples?", opcoes: ["O rendimento passa a render também", "A taxa é sempre maior", "Não há imposto"], correta: 0, explicacao: "Nos compostos, o rendimento de cada período se soma ao valor e passa a render junto." },
      { pergunta: "Inflação de 5% e rendimento de 6% no ano resultam em ganho real de aproximadamente:", opcoes: ["11%", "6%", "1%"], correta: 2, explicacao: "O ganho real é o que sobra acima da inflação: cerca de 1%." },
      { pergunta: "Qual a referência de tamanho para a reserva de emergência?", opcoes: ["1 mês de gastos", "3 a 6 meses de gastos", "Todo o patrimônio"], correta: 1, explicacao: "A referência educacional é de 3 a 6 meses de gastos, em algo seguro e com liquidez." },
    ],
  },
  {
    slug: "gestao-financeira",
    titulo: "Gestão financeira pessoal",
    descricao: "Orçamento, pagar-se primeiro, dívidas e metas.",
    icone: "base",
    aulas: ["orcamento-pessoal", "pague-se-primeiro", "dividas-e-credito", "metas-financeiras"],
    quiz: [
      { pergunta: "Na divisão de referência 50/30/20, os 20% vão para:", opcoes: ["Lazer", "O futuro: reserva e investimentos", "Moradia"], correta: 1, explicacao: "50% essencial, 30% variável e 20% para o futuro, como ponto de partida." },
      { pergunta: "\"Pagar-se primeiro\" significa:", opcoes: ["Guardar o que sobrar no fim do mês", "Separar o valor do futuro assim que a renda cai", "Pagar as dívidas por último"], correta: 1, explicacao: "O valor do futuro vira uma conta fixa, separada logo no começo do mês." },
      { pergunta: "Qual dívida costuma ser prioridade para quitar?", opcoes: ["Rotativo do cartão", "Financiamento imobiliário", "Nenhuma"], correta: 0, explicacao: "O rotativo do cartão e o cheque especial têm alguns dos juros mais altos do mercado." },
    ],
  },
  {
    slug: "tipos-investimentos",
    titulo: "Tipos de investimentos",
    descricao: "Renda fixa, ações, ETFs, FIIs, multimercado, exterior e cripto.",
    icone: "carteira",
    aulas: ["renda_fixa", "acoes_etfs", "bdrs-etfs", "fiis", "multimercado", "exterior", "cripto"],
    quiz: [
      { pergunta: "Qual destes tem garantia do FGC (até o limite)?", opcoes: ["CDB", "Debênture", "Ação"], correta: 0, explicacao: "CDB, LCI e LCA têm FGC até R$ 250 mil por CPF e instituição. Debêntures e ações não têm." },
      { pergunta: "Os rendimentos mensais de FIIs para pessoa física, pela regra atual:", opcoes: ["Pagam 15% de IR", "São isentos, com condições", "Não existem"], correta: 1, explicacao: "Hoje são isentos para pessoa física, desde que fundo e investidor cumpram algumas condições." },
      { pergunta: "O preço da maioria das criptomoedas vem principalmente de:", opcoes: ["Garantia do governo", "Lastro em ouro", "Oferta, procura e confiança"], correta: 2, explicacao: "A maioria não tem lastro físico nem garantia; o preço vem da oferta, procura, uso e confiança." },
    ],
  },
  {
    slug: "diversificacao",
    titulo: "Fundamentos da diversificação",
    descricao: "Correlação, alocação por classe e rebalanceamento.",
    icone: "escudo",
    aulas: ["por-que-diversificar", "correlacao", "alocacao-de-ativos", "rebalanceamento"],
    quiz: [
      { pergunta: "Dez ações de bancos formam uma carteira diversificada?", opcoes: ["Sim, são dez ativos", "Não, tendem a se mover juntas", "Depende da corretora"], correta: 1, explicacao: "Ativos do mesmo setor costumam ter correlação alta; diversificar é variar classes, setores e países." },
      { pergunta: "Rebalancear é:", opcoes: ["Vender tudo quando cai", "Voltar às proporções planejadas", "Comprar só o que mais subiu"], correta: 1, explicacao: "Rebalancear devolve a carteira à alocação combinada, controlando o risco." },
      { pergunta: "O que mais explica a oscilação de uma carteira no longo prazo?", opcoes: ["A alocação entre classes", "O horário das compras", "O número de ativos"], correta: 0, explicacao: "Quanto vai para cada classe pesa mais que a escolha individual de ativos." },
    ],
  },
  {
    slug: "tipos-acoes",
    titulo: "Tipos de ações",
    descricao: "ON, PN, units, tamanho, dividendos e setores.",
    icone: "acoes",
    aulas: ["on-pn-units", "tamanho-empresas", "dividendos-crescimento", "setores"],
    quiz: [
      { pergunta: "Uma ação com final 3 é, em geral:", opcoes: ["Preferencial", "Ordinária, com direito a voto", "Um FII"], correta: 1, explicacao: "Final 3 indica ação ordinária (ON), que dá direito a voto." },
      { pergunta: "Um ETF é:", opcoes: ["Uma cesta de ativos negociada como uma ação", "Um título do governo", "Um tipo de CDB"], correta: 0, explicacao: "ETFs replicam índices: uma cota dá exposição a vários ativos." },
      { pergunta: "Setores defensivos costumam:", opcoes: ["Oscilar mais na crise", "Depender muito do ciclo econômico", "Oscilar menos em diferentes cenários"], correta: 2, explicacao: "Energia, saneamento e saúde vendem serviços usados em qualquer cenário e tendem a oscilar menos." },
    ],
  },
  {
    slug: "acoes-etfs",
    titulo: "Ações e ETFs na prática",
    descricao: "Preço, proventos, indicadores, ETFs, custos e IR.",
    icone: "acoes",
    aulas: ["como-funciona-acao", "ganhos-com-acoes", "etfs-na-pratica", "custos-e-impostos-bolsa"],
    quiz: [
      { pergunta: "Quem recebe um dividendo anunciado?", opcoes: ["Quem tem a ação no fim da data com", "Quem compra no dia do pagamento", "Todos os clientes da corretora"], correta: 0, explicacao: "É preciso ter a ação ao fim da data com." },
      { pergunta: "Um ETF de ações:", opcoes: ["Tenta superar o índice", "Replica um índice em uma cota", "Tem garantia do FGC"], correta: 1, explicacao: "ETFs acompanham um índice; não têm FGC." },
      { pergunta: "Vendas de ações até R$ 20 mil no mês (operações comuns) são:", opcoes: ["Isentas de IR", "Tributadas em 20%", "Proibidas"], correta: 0, explicacao: "Há isenção para vendas de até R$ 20 mil no mês em operações comuns; não vale para ETFs." },
    ],
  },
  {
    slug: "analise-graficos",
    titulo: "Análise de gráficos",
    descricao: "Candles, tendências, suporte, médias e volume.",
    icone: "grafico",
    aulas: ["candles", "tendencias", "suporte-resistencia", "medias-moveis", "volume"],
    quiz: [
      { pergunta: "O corpo de um candle vai:", opcoes: ["Da máxima à mínima", "Da abertura ao fechamento", "Do volume ao preço"], correta: 1, explicacao: "O corpo liga abertura e fechamento; os pavios mostram máxima e mínima." },
      { pergunta: "Tendência de alta é marcada por:", opcoes: ["Topos e fundos cada vez mais altos", "Volume sempre baixo", "Preço parado"], correta: 0, explicacao: "Topos e fundos ascendentes caracterizam uma tendência de alta." },
      { pergunta: "Sobre médias móveis, é correto dizer que:", opcoes: ["Preveem o preço futuro", "Reagem depois do movimento", "Só existem para cripto"], correta: 1, explicacao: "Por usarem preços passados, as médias sempre reagem com atraso." },
    ],
  },
  {
    slug: "gestao-risco",
    titulo: "Gestão de risco",
    descricao: "Diversificação, volatilidade, tamanho de posição e vieses.",
    icone: "escudo",
    aulas: ["diversificacao", "volatilidade", "tamanho-posicao", "horizonte-liquidez", "vieses"],
    quiz: [
      { pergunta: "Drawdown é:", opcoes: ["A maior queda do topo até o fundo", "O rendimento mensal", "Uma taxa da corretora"], correta: 0, explicacao: "Drawdown mede a maior queda de um investimento entre um topo e o fundo seguinte." },
      { pergunta: "Rebalancear a carteira significa:", opcoes: ["Vender tudo na queda", "Voltar às proporções planejadas", "Concentrar no que mais subiu"], correta: 1, explicacao: "É ajustar a carteira para voltar à divisão planejada entre os investimentos." },
      { pergunta: "Vender na queda por medo e segurar demais o que só cai é efeito de:", opcoes: ["Diversificação", "Liquidez", "Aversão à perda"], correta: 2, explicacao: "A aversão à perda faz a dor da perda pesar mais do que a alegria do ganho." },
    ],
  },
  {
    slug: "analise-financeira",
    titulo: "Análise financeira",
    descricao: "P/L, P/VP, ROE, margens, dívida e dividend yield.",
    icone: "lupa",
    aulas: ["pl-pvp", "rentabilidade-margens", "endividamento", "dividend-yield", "demonstracoes"],
    quiz: [
      { pergunta: "O P/L é calculado como:", opcoes: ["Preço ÷ lucro por ação", "Lucro ÷ patrimônio", "Dívida ÷ caixa"], correta: 0, explicacao: "P/L é o preço da ação dividido pelo lucro por ação (LPA)." },
      { pergunta: "O ROE mostra:", opcoes: ["O volume negociado", "O lucro gerado sobre o patrimônio dos sócios", "O preço da ação"], correta: 1, explicacao: "ROE = lucro líquido ÷ patrimônio líquido." },
      { pergunta: "Se o preço de uma ação cai e os dividendos não mudam, o dividend yield:", opcoes: ["Cai", "Fica igual", "Sobe"], correta: 2, explicacao: "O yield é dividendos ÷ preço; com preço menor, o yield sobe, mesmo sem a empresa pagar mais." },
    ],
  },
];

export function moduloPorSlug(slug: string) {
  return MODULOS.find((m) => m.slug === slug);
}

export function moduloDaAula(aula: string) {
  return MODULOS.find((m) => m.aulas.includes(aula));
}

// Progresso: aulas lidas e quiz do módulo.
export function progressoModulo(m: Modulo, concluidos: string[]) {
  const lidas = m.aulas.filter((a) => concluidos.includes(`leitura:${a}`)).length;
  const quiz = concluidos.includes(`quiz:${m.slug}`);
  const total = m.aulas.length + 1;
  return { lidas, quiz, pct: Math.round(((lidas + (quiz ? 1 : 0)) / total) * 100) };
}
