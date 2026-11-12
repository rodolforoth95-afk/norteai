import type { Classe } from "@/lib/dominio/tipos";

// Vídeos curtos (formato vertical, 50 a 60 s), montados como animações no próprio app.
// Cada cena tem duração, texto na tela e narração (lida pela voz do aparelho, se ligada).

export type Icone =
  | "banco"
  | "escudo"
  | "calendario"
  | "moeda"
  | "predio"
  | "grafico"
  | "raio"
  | "cadeado"
  | "alvo"
  | "bitcoin"
  | "camadas"
  | "alerta"
  | "relogio"
  | "governo"
  | "carteira";

export type Cena = {
  seg: number;
  tipo: "abertura" | "numero" | "lista" | "grafico" | "barras" | "alerta" | "final";
  titulo: string;
  texto: string;
  narracao?: string;
  icone?: Icone;
  numero?: string;
  itens?: string[];
  serie?: number[];
  barras?: { rotulo: string; valor: number }[];
  prefixo?: string;
  sufixo?: string;
};

export type Video = {
  slug: string;
  titulo: string;
  chamada: string;
  classe?: Classe;
  cores: [string, string];
  custo?: number; // em coins; sem custo = liberado
  cenas: Cena[];
};

export const VIDEOS: Video[] = [
  {
    slug: "cdb",
    titulo: "CDB em 1 minuto",
    chamada: "Você empresta pro banco e ele te paga juros",
    classe: "renda_fixa",
    cores: ["#14215C", "#2D5BFF"],
    cenas: [
      { seg: 7, tipo: "abertura", icone: "banco", titulo: "CDB em 1 minuto", texto: "Você empresta dinheiro para um banco. Ele devolve com juros." },
      { seg: 8, tipo: "numero", numero: "100% do CDI", titulo: "O jeito de medir", texto: "O CDI anda colado na Selic. Um CDB de 100% do CDI rende praticamente o mesmo que ela." },
      {
        seg: 9,
        tipo: "lista",
        titulo: "3 sabores de CDB",
        texto: "Escolha conforme o objetivo.",
        itens: ["Pós-fixado: acompanha o CDI", "Prefixado: taxa fechada na compra", "IPCA+: inflação mais uma taxa"],
      },
      { seg: 8, tipo: "abertura", icone: "escudo", titulo: "Rede de proteção", texto: "O FGC garante até R$ 250 mil por CPF e por banco, se o banco quebrar." },
      {
        seg: 8,
        tipo: "lista",
        titulo: "Liquidez",
        texto: "Quando o dinheiro volta pra você.",
        itens: ["Diária: resgata quando quiser", "No vencimento: fica preso até a data"],
      },
      {
        seg: 9,
        tipo: "barras",
        titulo: "Imposto de renda",
        texto: "Tabela regressiva: quanto mais tempo, menos imposto. Regra atual.",
        sufixo: "%",
        barras: [
          { rotulo: "até 6 m", valor: 22.5 },
          { rotulo: "até 1 a", valor: 20 },
          { rotulo: "até 2 a", valor: 17.5 },
          { rotulo: "+2 anos", valor: 15 },
        ],
      },
      { seg: 6, tipo: "final", icone: "alvo", titulo: "Combina com", texto: "Reserva de emergência e metas de curto prazo." },
    ],
  },
  {
    slug: "tesouro",
    titulo: "Tesouro Direto sem mistério",
    chamada: "Emprestar para o governo a partir de poucos reais",
    classe: "renda_fixa",
    cores: ["#2D5BFF", "#8FA8FF"],
    cenas: [
      { seg: 7, tipo: "abertura", icone: "governo", titulo: "Tesouro Direto", texto: "Você empresta para o governo federal e recebe juros por isso." },
      { seg: 8, tipo: "numero", numero: "~R$ 30", titulo: "Para começar", texto: "Dá para comprar frações de título com pouco dinheiro, direto pela sua corretora." },
      {
        seg: 10,
        tipo: "lista",
        titulo: "Os 3 principais",
        texto: "Cada um tem uma missão.",
        itens: ["Selic: reserva de emergência", "Prefixado: taxa travada na compra", "IPCA+: proteger da inflação no longo prazo"],
      },
      {
        seg: 10,
        tipo: "grafico",
        titulo: "Marcação a mercado",
        texto: "Prefixado e IPCA+ oscilam no caminho. Vender antes do vencimento pode dar ganho ou perda.",
        serie: [100, 102, 99, 103, 101, 105, 104, 108, 107, 111],
      },
      { seg: 8, tipo: "abertura", icone: "relogio", titulo: "Levou até o fim?", texto: "Recebe exatamente a taxa contratada, sem surpresa." },
      { seg: 7, tipo: "alerta", icone: "alerta", titulo: "Custos", texto: "Tem imposto de renda pela tabela regressiva e uma taxa de custódia pequena da B3." },
      { seg: 5, tipo: "final", icone: "alvo", titulo: "Combina com", texto: "Reserva (Selic) e metas longas (IPCA+)." },
    ],
  },
  {
    slug: "acoes",
    titulo: "Ações: vire sócio de empresas",
    chamada: "Como funciona a bolsa em 55 segundos",
    classe: "acoes_etfs",
    cores: ["#1D2F85", "#FF8A3D"],
    cenas: [
      { seg: 7, tipo: "abertura", icone: "predio", titulo: "O que é uma ação", texto: "Um pedacinho de uma empresa. Comprou, virou sócio." },
      {
        seg: 8,
        tipo: "lista",
        titulo: "Como você ganha",
        texto: "Duas formas.",
        itens: ["Valorização: o preço sobe", "Dividendos: parte do lucro cai na sua conta"],
      },
      {
        seg: 9,
        tipo: "numero",
        numero: "PETR4",
        titulo: "Lendo o código",
        texto: "PETR é a empresa. 3 é ordinária, com voto. 4 é preferencial. 11 é unit. Exemplo só para explicar.",
      },
      { seg: 8, tipo: "numero", numero: "1 ação", titulo: "Mercado fracionário", texto: "Coloque F no fim do código e compre a partir de uma única ação." },
      {
        seg: 9,
        tipo: "grafico",
        titulo: "Sobe e desce",
        texto: "No curto prazo o preço chacoalha muito. Ações pedem prazo longo e estômago.",
        serie: [100, 92, 105, 97, 88, 110, 101, 118, 109, 125],
      },
      { seg: 8, tipo: "abertura", icone: "camadas", titulo: "Atalho: ETFs", texto: "Um ETF é uma cesta de ações numa cota só. Diversifica com pouco dinheiro." },
      { seg: 6, tipo: "final", icone: "alvo", titulo: "Combina com", texto: "Objetivos de mais de 5 anos e quem aguenta oscilação." },
    ],
  },
  {
    slug: "fiis",
    titulo: "Fundos imobiliários",
    chamada: "Renda de aluguel sem comprar um imóvel",
    classe: "fiis",
    cores: ["#2D5BFF", "#14B8A6"],
    cenas: [
      { seg: 7, tipo: "abertura", icone: "predio", titulo: "FIIs", texto: "Você compra cotas de um fundo dono de imóveis ou de títulos imobiliários." },
      {
        seg: 9,
        tipo: "lista",
        titulo: "O que tem dentro",
        texto: "Tipos mais comuns.",
        itens: ["Tijolo: shoppings, galpões, escritórios", "Papel: títulos de crédito imobiliário", "Fundos de fundos"],
      },
      { seg: 8, tipo: "abertura", icone: "calendario", titulo: "Todo mês", texto: "Muitos FIIs distribuem rendimentos mensais, vindos dos aluguéis e juros." },
      { seg: 8, tipo: "numero", numero: "Isento", titulo: "Rendimentos", texto: "Para pessoa física, os rendimentos mensais hoje são isentos de IR, com algumas condições." },
      {
        seg: 9,
        tipo: "grafico",
        titulo: "A cota oscila",
        texto: "O preço muda na bolsa todo dia. Juros altos costumam pesar nas cotas.",
        serie: [100, 98, 101, 96, 97, 99, 95, 98, 102, 101],
      },
      { seg: 8, tipo: "alerta", icone: "alerta", titulo: "Fique de olho", texto: "Vacância, inadimplência e concentração em um só imóvel. Sem garantia do FGC." },
      { seg: 6, tipo: "final", icone: "alvo", titulo: "Combina com", texto: "Quem quer renda mensal e aceita oscilação moderada." },
    ],
  },
  {
    slug: "cripto",
    titulo: "Bitcoin e cripto, sem hype",
    chamada: "O que é, de onde vem o valor e os riscos",
    classe: "cripto",
    cores: ["#14215C", "#FF8A3D"],
    cenas: [
      { seg: 7, tipo: "abertura", icone: "bitcoin", titulo: "Cripto", texto: "Moedas digitais registradas numa rede pública, a blockchain. Sem banco central." },
      { seg: 8, tipo: "numero", numero: "21 milhões", titulo: "Escassez", texto: "É o limite de bitcoins que vão existir. Parte do valor vem dessa escassez." },
      {
        seg: 8,
        tipo: "lista",
        titulo: "De onde vem o preço",
        texto: "Não há lastro físico nem garantia de governo.",
        itens: ["Oferta e procura", "Uso da rede", "Confiança das pessoas"],
      },
      {
        seg: 10,
        tipo: "grafico",
        titulo: "Montanha-russa",
        texto: "Quedas de mais de 50% em poucos meses já aconteceram várias vezes.",
        serie: [100, 140, 180, 120, 70, 85, 60, 110, 150, 95],
      },
      {
        seg: 9,
        tipo: "lista",
        titulo: "Formas de ter acesso",
        texto: "Cada uma com cuidados.",
        itens: ["Corretora de cripto (exchange)", "ETF de cripto na bolsa", "Fundos com cripto"],
      },
      { seg: 8, tipo: "alerta", icone: "cadeado", titulo: "Segurança", texto: "Sem FGC. Ative verificação em duas etapas e desconfie de lucro fácil: golpes são comuns." },
      { seg: 6, tipo: "final", icone: "alvo", titulo: "Combina com", texto: "Uma fatia pequena da carteira de quem aceita risco muito alto." },
    ],
  },
  // --- Treinamentos desbloqueados com coins ---
  {
    slug: "juros-compostos",
    titulo: "Juros compostos: o efeito bola de neve",
    chamada: "Por que começar cedo vale mais que começar com muito",
    cores: ["#1D2F85", "#5B7FFF"],
    custo: 100,
    cenas: [
      { seg: 7, tipo: "abertura", icone: "raio", titulo: "Juros sobre juros", texto: "O rendimento de hoje passa a render amanhã. É a bola de neve." },
      {
        seg: 10,
        tipo: "barras",
        titulo: "R$ 200 por mês a 0,8% ao mês",
        texto: "Total acumulado. Simulação ilustrativa, sem impostos nem taxas.",
        prefixo: "R$ ",
        sufixo: " mil",
        barras: [
          { rotulo: "5 anos", valor: 15 },
          { rotulo: "10 anos", valor: 40 },
          { rotulo: "20 anos", valor: 144 },
        ],
      },
      { seg: 9, tipo: "numero", numero: "Tempo > valor", titulo: "O segredo", texto: "Quem começa 10 anos antes, com menos, muitas vezes termina com mais." },
      {
        seg: 9,
        tipo: "grafico",
        titulo: "A curva acelera",
        texto: "No começo parece lento. Depois de alguns anos, a curva dispara.",
        serie: [10, 11, 13, 15, 18, 22, 28, 36, 47, 62],
      },
      {
        seg: 9,
        tipo: "lista",
        titulo: "Inimigos da bola de neve",
        texto: "O que trava o crescimento.",
        itens: ["Taxas altas", "Resgatar toda hora", "Dívidas com juros maiores"],
      },
      { seg: 8, tipo: "final", icone: "alvo", titulo: "Seu próximo passo", texto: "Defina um valor mensal possível e mantenha a constância." },
    ],
  },
  {
    slug: "diversificacao",
    titulo: "Diversificação na prática",
    chamada: "Não colocar todos os ovos na mesma cesta",
    cores: ["#FF8A3D", "#D9631A"],
    custo: 150,
    cenas: [
      { seg: 7, tipo: "abertura", icone: "camadas", titulo: "Diversificar", texto: "Espalhar o dinheiro para que um tropeço não derrube tudo." },
      {
        seg: 9,
        tipo: "lista",
        titulo: "3 camadas",
        texto: "Diversifique em níveis.",
        itens: ["Entre classes: renda fixa, ações, FIIs", "Dentro da classe: vários ativos", "Geografia: Brasil e exterior"],
      },
      { seg: 9, tipo: "numero", numero: "20%", titulo: "Sinal de alerta", texto: "Um único ativo acima de 20% da carteira já é concentração relevante." },
      {
        seg: 10,
        tipo: "grafico",
        titulo: "Menos sustos",
        texto: "Ativos diferentes não caem todos juntos. A carteira oscila menos.",
        serie: [100, 101, 99, 102, 103, 102, 105, 106, 105, 108],
      },
      { seg: 9, tipo: "alerta", icone: "alerta", titulo: "Cuidado com o excesso", texto: "Ter 40 ativos que você não acompanha também atrapalha. Simples e consistente." },
      { seg: 8, tipo: "final", icone: "carteira", titulo: "Na prática", texto: "Compare sua carteira com a faixa do seu estilo na aba Carteira." },
    ],
  },
  {
    slug: "reserva",
    titulo: "Reserva de emergência em 4 passos",
    chamada: "O colchão que protege todos os seus planos",
    cores: ["#2D5BFF", "#14215C"],
    custo: 100,
    cenas: [
      { seg: 7, tipo: "abertura", icone: "escudo", titulo: "Reserva de emergência", texto: "Dinheiro guardado para imprevistos: demissão, saúde, carro quebrado." },
      { seg: 9, tipo: "numero", numero: "3 a 6 meses", titulo: "Quanto guardar", texto: "A referência é cobrir de 3 a 6 meses dos seus gastos mensais." },
      {
        seg: 10,
        tipo: "lista",
        titulo: "Onde deixar",
        texto: "Três regras de ouro.",
        itens: ["Baixo risco", "Liquidez diária", "Separada do dinheiro do dia a dia"],
      },
      {
        seg: 10,
        tipo: "barras",
        titulo: "Montando aos poucos",
        texto: "Exemplo: gastos de R$ 2.000, meta de 3 meses, guardando R$ 500 por mês.",
        sufixo: "%",
        barras: [
          { rotulo: "mês 3", valor: 25 },
          { rotulo: "mês 6", valor: 50 },
          { rotulo: "mês 12", valor: 100 },
        ],
      },
      { seg: 8, tipo: "alerta", icone: "alerta", titulo: "Usou? Reponha", texto: "Depois de um imprevisto, volte a encher a reserva antes de arriscar mais." },
      { seg: 7, tipo: "final", icone: "alvo", titulo: "Seu próximo passo", texto: "Calcule seus gastos do mês e defina sua meta." },
    ],
  },
];

export function duracaoVideo(v: Video) {
  return v.cenas.reduce((s, c) => s + c.seg, 0);
}

export function videosDasClasses(classes: Classe[]) {
  return VIDEOS.filter((v) => !v.custo && v.classe && classes.includes(v.classe));
}
