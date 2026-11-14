import type { Aula } from "./aulas";

// Aulas das trilhas (módulos). Texto educacional: explica conceitos, nunca indica ativos.
// Códigos de ações aparecem só como exemplo didático.

export const AULAS_MODULOS: Aula[] = [
  // --- Fundamentos ---------------------------------------------------------------------
  {
    slug: "juros-compostos",
    titulo: "Juros compostos: o efeito bola de neve",
    categoria: "Fundamentos",
    minutos: 4,
    video: "juros-compostos",
    ilustracao: "juros",
    secoes: [
      { titulo: "Juros sobre juros", paragrafos: ["Nos juros simples, o rendimento é calculado só sobre o valor inicial. Nos compostos, o rendimento de cada mês passa a render também no mês seguinte. Com o tempo, a curva acelera."] },
      { titulo: "Exemplo ilustrativo", paragrafos: ["R$ 200 por mês a 0,8% ao mês viram cerca de R$ 15 mil em 5 anos, R$ 40 mil em 10 anos e R$ 144 mil em 20 anos (sem impostos e taxas). Em 20 anos, você aportou R$ 48 mil; o resto veio dos juros."] },
      { titulo: "O que atrapalha", paragrafos: ["Taxas altas, resgates frequentes e dívidas com juros maiores do que o rendimento. A dívida do cartão também é composta, só que contra você."] },
    ],
    formas: [],
  },
  {
    slug: "inflacao",
    titulo: "Inflação e poder de compra",
    categoria: "Fundamentos",
    minutos: 3,
    secoes: [
      { titulo: "O que é", paragrafos: ["Inflação é o aumento geral dos preços. Se ela foi de 5% no ano, você precisa de R$ 105 para comprar o que custava R$ 100."] },
      { titulo: "Rendimento real", paragrafos: ["O que importa é quanto o dinheiro rende acima da inflação. Render 6% num ano de inflação de 5% é um ganho real de cerca de 1%. Dinheiro parado perde poder de compra todo mês."] },
      { titulo: "Como medir", paragrafos: ["O IPCA é o índice oficial de inflação no Brasil. Títulos como o Tesouro IPCA+ pagam a inflação mais uma taxa, por isso são usados para metas longas."] },
    ],
    formas: [],
  },
  {
    slug: "reserva-emergencia",
    titulo: "Reserva de emergência",
    categoria: "Fundamentos",
    minutos: 3,
    video: "reserva",
    secoes: [
      { titulo: "Para que serve", paragrafos: ["É o dinheiro para imprevistos: perda de renda, saúde, conserto. Ela evita que você precise vender investimentos na hora errada ou entrar no cheque especial."] },
      { titulo: "Quanto guardar", paragrafos: ["A referência é de 3 a 6 meses dos seus gastos. Quem tem renda variável ou é autônomo costuma mirar no topo dessa faixa."] },
      { titulo: "Onde deixar", passos: ["Baixo risco: o valor não pode oscilar muito.", "Liquidez diária: precisa estar disponível rápido.", "Separada da conta do dia a dia, para não ser gasta sem perceber."] },
    ],
    formas: [],
  },
  {
    slug: "objetivos-e-prazos",
    titulo: "Objetivos e prazos",
    categoria: "Fundamentos",
    minutos: 3,
    secoes: [
      { titulo: "Dê nome ao dinheiro", paragrafos: ["Investir sem objetivo dificulta escolher onde aplicar. Uma meta tem nome, valor e prazo: \"viagem, R$ 8 mil, em 18 meses\"."] },
      { titulo: "O prazo muda tudo", paragrafos: ["Dinheiro para os próximos 2 anos não deve depender de investimentos que oscilam muito. Para mais de 5 anos, dá para tolerar mais oscilação em busca de mais potencial."] },
      { titulo: "Uma carteira, várias metas", paragrafos: ["É comum ter a reserva em algo líquido, metas de médio prazo em renda fixa com vencimento próximo e a aposentadoria em uma carteira mais diversificada."] },
    ],
    formas: [],
  },

  // --- Gestão financeira ------------------------------------------------------------------
  {
    slug: "orcamento-pessoal",
    titulo: "Orçamento: para onde vai o seu dinheiro",
    categoria: "Gestão financeira",
    minutos: 4,
    secoes: [
      { titulo: "O primeiro passo é enxergar", paragrafos: ["Antes de cortar qualquer coisa, anote tudo o que entra e sai por um mês. A maioria das pessoas se surpreende com o peso dos gastos pequenos e frequentes, como delivery, transporte por aplicativo e assinaturas."] },
      { titulo: "Uma divisão de referência", paragrafos: ["Uma regra simples para começar: cerca de 50% da renda para o essencial (moradia, contas, mercado, saúde), 30% para o variável (lazer, restaurantes, compras) e 20% para o futuro (reserva e investimentos). Não é lei: serve para você comparar onde está."] },
      { titulo: "Revise todo mês", passos: ["Compare o mês com a média dos três anteriores.", "Escolha uma ou duas categorias para ajustar, não todas.", "Defina um limite em reais, não só uma intenção."] },
    ],
    formas: [],
  },
  {
    slug: "pague-se-primeiro",
    titulo: "Pague-se primeiro",
    categoria: "Gestão financeira",
    minutos: 3,
    secoes: [
      { titulo: "Inverta a ordem", paragrafos: ["O jeito mais comum de guardar dinheiro é esperar o fim do mês e ver o que sobrou. Quase nunca sobra. \"Pagar-se primeiro\" é separar o valor do futuro assim que a renda cai, como se fosse uma conta fixa."] },
      { titulo: "Comece pequeno e suba aos poucos", paragrafos: ["Guardar 5% hoje e subir um ou dois pontos por mês costuma funcionar melhor do que tentar 30% de uma vez. O hábito importa mais que o valor no começo."] },
      { titulo: "Automatize", paragrafos: ["Programar uma transferência para o dia seguinte ao pagamento tira a decisão do caminho. O que não está na conta do dia a dia é menos gasto sem perceber."] },
    ],
    formas: [],
  },
  {
    slug: "dividas-e-credito",
    titulo: "Dívidas, cartão e crédito",
    categoria: "Gestão financeira",
    minutos: 4,
    secoes: [
      { titulo: "Nem toda dívida é igual", paragrafos: ["Financiamentos com juros baixos para algo durável são diferentes do rotativo do cartão e do cheque especial, que estão entre os juros mais altos do país. Dívida cara come qualquer rendimento que você consiga investindo."] },
      { titulo: "A ordem certa", passos: ["Liste as dívidas com o valor e os juros de cada uma.", "Quite primeiro as de juros mais altos (cartão rotativo, cheque especial).", "Negocie: trocar uma dívida cara por uma mais barata já é um ganho.", "Só depois aumente os investimentos de risco."] },
      { titulo: "Cartão de crédito como ferramenta", paragrafos: ["Usado com fatura paga integralmente, o cartão organiza os gastos e pode render pontos. O problema começa quando a fatura vira parcelamento ou pagamento mínimo."] },
    ],
    formas: [],
  },
  {
    slug: "metas-financeiras",
    titulo: "Metas que funcionam",
    categoria: "Gestão financeira",
    minutos: 3,
    secoes: [
      { titulo: "Específica, medível e com prazo", paragrafos: ["\"Juntar dinheiro\" é vago. \"R$ 12 mil para a reserva em 12 meses\" mostra quanto guardar por mês (R$ 1.000) e permite acompanhar se está no caminho."] },
      { titulo: "Acompanhe o progresso", paragrafos: ["Ver a barra andando motiva. Revisar uma vez por mês ajuda a corrigir rota antes que a meta pareça impossível."] },
      { titulo: "Ajuste sem culpa", paragrafos: ["Imprevistos acontecem. Mudar o prazo ou o valor é melhor do que abandonar a meta."] },
    ],
    formas: [],
  },

  // --- Diversificação ---------------------------------------------------------------------
  {
    slug: "por-que-diversificar",
    titulo: "Por que diversificar",
    categoria: "Diversificação",
    minutos: 3,
    secoes: [
      { titulo: "Não colocar todos os ovos na mesma cesta", paragrafos: ["Diversificar é distribuir o dinheiro entre investimentos que reagem de forma diferente aos mesmos acontecimentos. Assim, uma queda forte em um deles pesa menos no total."] },
      { titulo: "Diversificar não é ter muitos ativos", paragrafos: ["Dez ações do mesmo setor não são uma carteira diversificada: costumam subir e cair juntas. O que conta é a variedade de classes, setores, países e prazos."] },
      { titulo: "O objetivo", paragrafos: ["A diversificação não elimina o risco nem garante ganho. Ela busca um caminho mais estável, que você consiga manter nos momentos ruins."] },
    ],
    formas: [],
  },
  {
    slug: "correlacao",
    titulo: "Correlação: quando os ativos andam juntos",
    categoria: "Diversificação",
    minutos: 4,
    secoes: [
      { titulo: "O que é", paragrafos: ["Correlação mede o quanto dois investimentos costumam se mover na mesma direção. Correlação alta: sobem e caem juntos. Baixa ou negativa: um pode compensar o outro."] },
      { titulo: "Exemplos didáticos", paragrafos: ["Ações de bancos tendem a se mover parecido entre si. Já a renda fixa pós-fixada e o dólar costumam ter comportamento diferente da bolsa brasileira em crises locais."] },
      { titulo: "Cuidado", paragrafos: ["Correlações mudam com o tempo e em crises fortes muitos ativos caem juntos. Por isso a reserva de emergência fica fora da parte de risco."] },
    ],
    formas: [],
  },
  {
    slug: "alocacao-de-ativos",
    titulo: "Alocação: a parte de cada classe",
    categoria: "Diversificação",
    minutos: 4,
    secoes: [
      { titulo: "A decisão mais importante", paragrafos: ["Mais do que escolher qual ativo comprar, definir quanto vai para renda fixa, ações, FIIs e exterior explica boa parte do resultado e da oscilação de uma carteira ao longo do tempo."] },
      { titulo: "Depende de você", passos: ["Prazo: quanto mais longo, mais espaço para oscilação.", "Perfil: quanto de queda você aguenta sem vender.", "Objetivos: cada meta pode ter uma alocação."] },
      { titulo: "No Findomo", paragrafos: ["O seu perfil de investidor mostra faixas de referência por classe, e a Carteira compara a sua distribuição com elas."] },
    ],
    formas: [],
  },
  {
    slug: "rebalanceamento",
    titulo: "Rebalanceamento",
    categoria: "Diversificação",
    minutos: 3,
    secoes: [
      { titulo: "A carteira sai do lugar sozinha", paragrafos: ["Se as ações sobem muito, passam a ocupar uma fatia maior do que a planejada, e o risco da carteira aumenta sem você perceber."] },
      { titulo: "Como funciona", paragrafos: ["Rebalancear é voltar às proporções combinadas: usar os novos aportes na classe que ficou para trás ou, se preciso, vender um pouco da que passou do limite."] },
      { titulo: "Com que frequência", paragrafos: ["Uma revisão a cada seis meses, ou quando uma classe se afastar alguns pontos da meta, costuma bastar. Mexer demais gera custos e impostos."] },
    ],
    formas: [],
  },

  // --- Ações e ETFs na prática ------------------------------------------------------------
  {
    slug: "como-funciona-acao",
    titulo: "O que é uma ação e como o preço se forma",
    categoria: "Ações e ETFs",
    minutos: 4,
    secoes: [
      { titulo: "Um pedaço da empresa", paragrafos: ["Ao comprar uma ação, você vira sócio de uma pequena parte da empresa. Se ela lucra e cresce, a tendência no longo prazo é que a ação acompanhe; se vai mal, também."] },
      { titulo: "O preço do dia a dia", paragrafos: ["Na bolsa, o preço sobe e desce conforme compradores e vendedores negociam. No curto prazo, notícias e humor do mercado pesam muito; no longo, os resultados da empresa tendem a pesar mais."] },
      { titulo: "Lote e fracionário", paragrafos: ["As ações são negociadas em lotes de 100, mas o mercado fracionário (código com F no final) permite comprar a partir de uma unidade."] },
    ],
    formas: [],
  },
  {
    slug: "ganhos-com-acoes",
    titulo: "Como se ganha com ações: valorização e proventos",
    categoria: "Ações e ETFs",
    minutos: 4,
    secoes: [
      { titulo: "Duas fontes", paragrafos: ["Valorização é a diferença entre o preço de venda e o de compra. Proventos são a parte do lucro distribuída aos acionistas, como dividendos e juros sobre capital próprio (JCP)."] },
      { titulo: "Dividendos e JCP", paragrafos: ["Pela regra atual, dividendos são isentos de IR para pessoa física; o JCP tem 15% retido na fonte. A data com define quem recebe: é preciso ter a ação no fim desse dia."] },
      { titulo: "Indicadores para comparar", paragrafos: ["P/L (preço sobre lucro), P/VP (preço sobre valor patrimonial) e dividend yield ajudam a comparar empresas do mesmo setor. Nenhum deles sozinho diz se uma ação está cara ou barata."] },
    ],
    formas: [],
  },
  {
    slug: "etfs-na-pratica",
    titulo: "ETFs na prática",
    categoria: "Ações e ETFs",
    minutos: 4,
    secoes: [
      { titulo: "Uma cesta em uma cota", paragrafos: ["Um ETF é um fundo negociado na bolsa que replica um índice. Com uma cota, você tem exposição a todas as empresas do índice, na mesma proporção."] },
      { titulo: "Vantagens e limites", passos: ["Diversificação imediata com pouco dinheiro.", "Taxa de administração geralmente menor que a de fundos ativos.", "Não tenta superar o índice: acompanha, para o bem e para o mal.", "Há ETFs de bolsa brasileira, exterior, renda fixa e outros temas."] },
      { titulo: "Impostos", paragrafos: ["ETFs de ações pagam 15% de IR sobre o lucro na venda, sem a isenção de R$ 20 mil mensais que vale para ações. ETFs de renda fixa seguem uma tabela própria."] },
    ],
    formas: [],
  },
  {
    slug: "custos-e-impostos-bolsa",
    titulo: "Custos e impostos na bolsa",
    categoria: "Ações e ETFs",
    minutos: 3,
    secoes: [
      { titulo: "Custos", paragrafos: ["Corretagem (muitas corretoras zeram), emolumentos da B3 e, em fundos e ETFs, a taxa de administração. Pequenos custos repetidos muitas vezes fazem diferença."] },
      { titulo: "Imposto de renda", paragrafos: ["Em ações, vendas de até R$ 20 mil no mês são isentas para operações comuns. Acima disso, o lucro paga 15% (day trade: 20%), recolhido pelo próprio investidor via DARF até o último dia útil do mês seguinte."] },
      { titulo: "Organize-se", paragrafos: ["Guarde as notas de corretagem e registre preço médio, quantidade e data. A Carteira do Findomo ajuda a manter esse histórico."] },
    ],
    formas: [],
  },

  // --- Tipos de ações -------------------------------------------------------------------
  {
    slug: "on-pn-units",
    titulo: "ON, PN e Units: os tipos de ação",
    categoria: "Tipos de ações",
    minutos: 4,
    secoes: [
      { titulo: "Ordinárias (ON, final 3)", paragrafos: ["Dão direito a voto nas assembleias da empresa. Exemplo didático: VALE3."] },
      { titulo: "Preferenciais (PN, final 4, 5 ou 6)", paragrafos: ["Em geral não votam, mas têm preferência no recebimento de dividendos. Exemplo didático: PETR4."] },
      { titulo: "Units (final 11)", paragrafos: ["Pacotes que juntam ações ON e PN da mesma empresa. Atenção: o final 11 também é usado por FIIs, ETFs e BDRs, então confira o que é antes de comparar."] },
    ],
    formas: [],
  },
  {
    slug: "tamanho-empresas",
    titulo: "Small, mid e large caps",
    categoria: "Tipos de ações",
    minutos: 3,
    secoes: [
      { titulo: "O que é \"cap\"", paragrafos: ["Vem de market capitalization, o valor de mercado: preço da ação vezes o número de ações. Ele indica o tamanho da empresa na bolsa."] },
      { titulo: "As diferenças", paragrafos: ["Large caps são empresas grandes, mais negociadas e em geral mais estáveis. Small caps são menores, com mais espaço para crescer e também mais oscilação e menos liquidez."] },
      { titulo: "Na prática", paragrafos: ["Na aba Mercado, a página de cada ativo mostra o valor de mercado. Compare empresas de tamanho parecido e lembre que pouca liquidez pode dificultar vender na hora que quiser."] },
    ],
    formas: [],
  },
  {
    slug: "dividendos-crescimento",
    titulo: "Dividendos ou crescimento?",
    categoria: "Tipos de ações",
    minutos: 4,
    secoes: [
      { titulo: "Empresas pagadoras", paragrafos: ["Negócios maduros, com lucro estável, costumam distribuir boa parte do lucro aos acionistas como dividendos e juros sobre capital próprio (JCP)."] },
      { titulo: "Empresas de crescimento", paragrafos: ["Reinvestem o lucro para crescer mais rápido. Pagam pouco hoje, e o retorno esperado vem da valorização, que é incerta."] },
      { titulo: "Cuidado com armadilhas", paragrafos: ["Um dividend yield muito alto pode ser sinal de que o preço da ação caiu por problemas na empresa, ou de um pagamento extraordinário que não vai se repetir."] },
    ],
    formas: [],
  },
  {
    slug: "bdrs-etfs",
    titulo: "BDRs e ETFs",
    categoria: "Tipos de ações",
    minutos: 3,
    secoes: [
      { titulo: "BDRs", paragrafos: ["Recibos negociados na B3 que representam ações de empresas estrangeiras. Terminam em 34, 35, 32, 33 ou 39. O preço acompanha a ação lá fora e o dólar."] },
      { titulo: "ETFs", paragrafos: ["Fundos negociados na bolsa que replicam um índice. Com uma cota você tem um pedaço de dezenas de empresas. Exemplos didáticos: BOVA11 (Ibovespa) e IVVB11 (S&P 500)."] },
      { titulo: "Pontos de atenção", paragrafos: ["ETFs cobram taxa de administração. BDRs e ETFs internacionais têm risco cambial e regras de imposto próprias."] },
    ],
    formas: [],
  },
  {
    slug: "setores",
    titulo: "Setores cíclicos e defensivos",
    categoria: "Tipos de ações",
    minutos: 3,
    secoes: [
      { titulo: "Cíclicos", paragrafos: ["Varejo, construção, siderurgia e turismo dependem muito do ritmo da economia: crescem bem nas fases boas e sofrem nas recessões."] },
      { titulo: "Defensivos", paragrafos: ["Energia elétrica, saneamento e saúde vendem serviços que as pessoas usam em qualquer cenário. Costumam oscilar menos."] },
      { titulo: "Por que importa", paragrafos: ["Concentrar a carteira em um só setor aumenta o risco. Juros altos, por exemplo, costumam pesar mais sobre empresas endividadas e de consumo."] },
    ],
    formas: [],
  },

  // --- Análise de gráficos ----------------------------------------------------------------
  {
    slug: "candles",
    titulo: "Lendo um candle",
    categoria: "Análise de gráficos",
    minutos: 4,
    ilustracao: "candles",
    secoes: [
      { titulo: "As 4 informações", paragrafos: ["Cada candle (vela) resume um período, como um dia: preço de abertura, de fechamento, a máxima e a mínima."] },
      { titulo: "Corpo e pavio", paragrafos: ["O corpo vai da abertura ao fechamento. Verde (ou vazio) quando fechou acima da abertura; vermelho quando fechou abaixo. Os pavios mostram até onde o preço foi durante o período."] },
      { titulo: "Um limite importante", paragrafos: ["Um candle isolado diz pouco. A leitura de gráficos descreve o comportamento passado do preço; ela não prevê o futuro e não substitui entender a empresa."] },
    ],
    formas: [],
  },
  {
    slug: "tendencias",
    titulo: "Tendências de alta, baixa e lateral",
    categoria: "Análise de gráficos",
    minutos: 3,
    ilustracao: "tendencia",
    secoes: [
      { titulo: "Topos e fundos", paragrafos: ["Tendência de alta: topos e fundos cada vez mais altos. De baixa: cada vez mais baixos. Lateral: o preço oscila numa faixa sem direção clara."] },
      { titulo: "Prazos diferentes", paragrafos: ["Uma ação pode estar em alta no gráfico de 1 ano e em baixa no de 1 mês. Por isso, o período escolhido muda a leitura."] },
      { titulo: "Na prática", paragrafos: ["Na página de cada ativo, alterne entre 5 dias, 1 mês e 3 meses e observe como a impressão muda conforme o prazo."] },
    ],
    formas: [],
  },
  {
    slug: "suporte-resistencia",
    titulo: "Suporte e resistência",
    categoria: "Análise de gráficos",
    minutos: 3,
    ilustracao: "suporte",
    secoes: [
      { titulo: "Suporte", paragrafos: ["Região de preço onde, no passado, as quedas pararam com frequência, porque muitos compradores apareceram ali."] },
      { titulo: "Resistência", paragrafos: ["Região onde as altas costumaram parar, porque muitos vendedores apareceram. Quando é rompida, às vezes vira suporte."] },
      { titulo: "Zonas, não linhas", paragrafos: ["São faixas aproximadas, não preços exatos, e podem deixar de funcionar a qualquer momento, especialmente diante de notícias."] },
    ],
    formas: [],
  },
  {
    slug: "medias-moveis",
    titulo: "Médias móveis",
    categoria: "Análise de gráficos",
    minutos: 3,
    ilustracao: "medias",
    secoes: [
      { titulo: "O que são", paragrafos: ["A média dos fechamentos dos últimos N dias, recalculada a cada dia. A média de 20 dias suaviza o ruído e mostra a direção de curto prazo; a de 200 dias, a de longo prazo."] },
      { titulo: "Como são lidas", paragrafos: ["Preço acima da média costuma ser descrito como tendência de alta; abaixo, de baixa. O cruzamento de médias curtas e longas é um sinal muito citado."] },
      { titulo: "Atraso", paragrafos: ["Como olham para trás, as médias sempre reagem depois do movimento. Elas descrevem, não antecipam."] },
    ],
    formas: [],
  },
  {
    slug: "volume",
    titulo: "Volume de negociação",
    categoria: "Análise de gráficos",
    minutos: 3,
    ilustracao: "volume",
    secoes: [
      { titulo: "O que mede", paragrafos: ["Quantas ações trocaram de mãos no período. Na aba Mercado, \"Mais negociadas\" ordena os ativos por volume."] },
      { titulo: "Por que importa", paragrafos: ["Movimentos com volume alto mostram que muita gente participou. Alta forte com volume baixo pode ser frágil."] },
      { titulo: "Liquidez", paragrafos: ["Ativos com pouco volume podem ter diferença grande entre o preço de compra e o de venda, e ser difíceis de vender rápido."] },
    ],
    formas: [],
  },

  // --- Gestão de risco ---------------------------------------------------------------------
  {
    slug: "volatilidade",
    titulo: "Volatilidade e quedas máximas",
    categoria: "Gestão de risco",
    minutos: 4,
    ilustracao: "drawdown",
    secoes: [
      { titulo: "Volatilidade", paragrafos: ["Mede o quanto o preço sobe e desce. Quanto maior, mais imprevisível o valor no curto prazo."] },
      { titulo: "Queda máxima (drawdown)", paragrafos: ["É a maior queda do topo até o fundo num período. Ações já tiveram quedas de 40% a 50% em crises; criptomoedas, de mais de 70%."] },
      { titulo: "Teste pessoal", paragrafos: ["Imagine sua carteira 30% menor por um ano. Se isso tiraria seu sono ou te faria vender tudo, o risco está acima do que você tolera."] },
    ],
    formas: [],
  },
  {
    slug: "tamanho-posicao",
    titulo: "Tamanho de cada investimento",
    categoria: "Gestão de risco",
    minutos: 3,
    secoes: [
      { titulo: "Quanto em cada um", paragrafos: ["Tão importante quanto escolher o investimento é decidir quanto colocar nele. Uma referência educacional comum é que um único ativo de risco não passe de 5% a 10% da carteira."] },
      { titulo: "Rebalancear", paragrafos: ["Com o tempo, o que subiu passa a pesar mais. Rebalancear é voltar às proporções planejadas, vendendo um pouco do que cresceu demais ou aportando no que ficou para trás."] },
      { titulo: "No app", paragrafos: ["A aba Carteira mostra quanto cada classe e cada ativo pesam, e avisa quando um único investimento passa de 20%."] },
    ],
    formas: [],
  },
  {
    slug: "horizonte-liquidez",
    titulo: "Horizonte e liquidez",
    categoria: "Gestão de risco",
    minutos: 3,
    secoes: [
      { titulo: "Combine prazo e investimento", paragrafos: ["O maior risco é precisar do dinheiro quando o investimento está em queda. Por isso, dinheiro de curto prazo combina com investimentos de baixa oscilação e boa liquidez."] },
      { titulo: "Liquidez não é rentabilidade", paragrafos: ["Um título pode render bem, mas ter carência ou vencimento longo. Antes de aplicar, confira quando e como o dinheiro volta."] },
      { titulo: "Escada de vencimentos", paragrafos: ["Distribuir aplicações com vencimentos diferentes ajuda a ter dinheiro disponível em cada etapa dos seus planos."] },
    ],
    formas: [],
  },
  {
    slug: "vieses",
    titulo: "Armadilhas da mente",
    categoria: "Gestão de risco",
    minutos: 4,
    secoes: [
      { titulo: "Efeito manada", paragrafos: ["Comprar porque todo mundo está comprando, geralmente depois que o preço já subiu muito."] },
      { titulo: "Aversão à perda", paragrafos: ["A dor de perder R$ 100 é maior do que a alegria de ganhar R$ 100. Isso leva a vender na queda e segurar demais o que só cai."] },
      { titulo: "Excesso de confiança", paragrafos: ["Algumas operações certas seguidas dão a sensação de que dá para prever o mercado. Regras definidas antes ajudam a não decidir no impulso."] },
    ],
    formas: [],
  },

  // --- Análise financeira --------------------------------------------------------------------
  {
    slug: "pl-pvp",
    titulo: "P/L e P/VP: preço comparado ao lucro e ao patrimônio",
    categoria: "Análise financeira",
    minutos: 4,
    secoes: [
      { titulo: "P/L", paragrafos: ["Preço da ação dividido pelo lucro por ação (LPA). Um P/L de 10 indica que, mantido o lucro atual, seriam 10 anos de lucro para \"pagar\" o preço. A página de cada ativo mostra P/L e LPA quando disponíveis."] },
      { titulo: "P/VP", paragrafos: ["Preço dividido pelo valor patrimonial por ação. Abaixo de 1, a bolsa avalia a empresa por menos do que o patrimônio contábil."] },
      { titulo: "Compare com cuidado", paragrafos: ["Indicadores só fazem sentido comparados com empresas do mesmo setor e com o histórico da própria empresa. P/L baixo pode refletir problemas, não uma pechincha."] },
    ],
    formas: [],
  },
  {
    slug: "rentabilidade-margens",
    titulo: "ROE e margens",
    categoria: "Análise financeira",
    minutos: 3,
    secoes: [
      { titulo: "ROE", paragrafos: ["Retorno sobre o patrimônio: lucro dividido pelo patrimônio líquido. Mostra quanto a empresa gera de lucro com o dinheiro dos sócios."] },
      { titulo: "Margens", paragrafos: ["Margem bruta, operacional e líquida mostram quanto de cada R$ 100 vendidos sobra em cada etapa. Margens estáveis ou crescentes indicam eficiência."] },
      { titulo: "Contexto", paragrafos: ["Bancos, varejistas e empresas de tecnologia têm margens naturalmente muito diferentes. Compare dentro do setor."] },
    ],
    formas: [],
  },
  {
    slug: "endividamento",
    titulo: "Endividamento",
    categoria: "Análise financeira",
    minutos: 3,
    secoes: [
      { titulo: "Dívida líquida / EBITDA", paragrafos: ["Compara o que a empresa deve (descontado o caixa) com a geração de caixa operacional anual. Um valor de 2 significa cerca de 2 anos de geração de caixa para quitar a dívida."] },
      { titulo: "Por que importa", paragrafos: ["Empresas muito endividadas sofrem mais com juros altos e crises, porque parte grande do lucro vai para pagar juros."] },
      { titulo: "Setores", paragrafos: ["Empresas de energia e infraestrutura convivem com mais dívida por terem receitas previsíveis. Bancos são analisados de outra forma."] },
    ],
    formas: [],
  },
  {
    slug: "dividend-yield",
    titulo: "Dividend yield",
    categoria: "Análise financeira",
    minutos: 3,
    secoes: [
      { titulo: "O cálculo", paragrafos: ["Dividendos pagos nos últimos 12 meses divididos pelo preço atual da ação. Uma ação de R$ 50 que pagou R$ 3 tem yield de 6%."] },
      { titulo: "O preço mexe no yield", paragrafos: ["Se a ação cai, o yield sobe mesmo sem a empresa pagar mais. Por isso, olhe também a consistência dos pagamentos ao longo dos anos."] },
      { titulo: "Passado não é promessa", paragrafos: ["Dividendos dependem do lucro futuro e das decisões da empresa. Rentabilidade passada não garante resultado futuro."] },
    ],
    formas: [],
  },
  {
    slug: "demonstracoes",
    titulo: "Balanço e resultado: o básico",
    categoria: "Análise financeira",
    minutos: 4,
    secoes: [
      { titulo: "Demonstração de resultado (DRE)", paragrafos: ["Mostra receita, custos, despesas e lucro de um período. É o \"filme\" do trimestre ou do ano."] },
      { titulo: "Balanço patrimonial", paragrafos: ["Uma \"foto\" do que a empresa tem (ativos), deve (passivos) e do que pertence aos sócios (patrimônio líquido)."] },
      { titulo: "Onde encontrar", paragrafos: ["Empresas listadas publicam os resultados todo trimestre no site de relações com investidores (RI) e na CVM. Comece pelos destaques do release de resultados."] },
    ],
    formas: [],
  },
];
