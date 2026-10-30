import type { CampoEntrevista, Respostas } from "./tipos";

export type Pergunta = { campo: CampoEntrevista; texto: string; opcoes: string[] };

// Roteiro da entrevista (Tela 4). As opções são os únicos valores aceitos pelo servidor.
export const PERGUNTAS: Pergunta[] = [
  {
    campo: "objetivo_principal",
    texto: "Qual é o seu principal objetivo com dinheiro hoje?",
    opcoes: [
      "Montar uma reserva para imprevistos",
      "Comprar algo (carro, imóvel, viagem)",
      "Aposentadoria ou independência financeira",
      "Fazer meu dinheiro render mais",
      "Ainda não sei",
    ],
  },
  {
    campo: "horizonte",
    texto: "Em quanto tempo você quer chegar lá?",
    opcoes: ["Até 2 anos", "De 2 a 5 anos", "Mais de 5 anos"],
  },
  {
    campo: "patrimonio_faixa",
    texto: "Somando tudo, quanto você tem guardado ou investido hoje?",
    opcoes: ["Nada ainda", "Até R$ 5 mil", "R$ 5 mil a R$ 20 mil", "R$ 20 mil a R$ 50 mil", "Mais de R$ 50 mil"],
  },
  {
    campo: "sobra_mensal_faixa",
    texto: "Por mês, quanto costuma sobrar depois de pagar as contas?",
    opcoes: ["Nada ou quase nada", "Até R$ 300", "R$ 300 a R$ 1.000", "R$ 1.000 a R$ 3.000", "Mais de R$ 3.000"],
  },
  {
    campo: "tem_divida_cara",
    texto: "Você tem alguma dívida de cartão de crédito, cheque especial ou empréstimo pessoal?",
    opcoes: ["Sim", "Não", "Prefiro não dizer"],
  },
  {
    campo: "reserva_meses",
    texto: "Se surgisse um imprevisto hoje, por quantos meses você pagaria suas contas só com o que tem guardado?",
    opcoes: ["Menos de 1 mês", "1 a 3 meses", "3 a 6 meses", "Mais de 6 meses"],
  },
  {
    campo: "reacao_queda",
    texto: "Imagine que você investiu R$ 1.000 e, em um mês, eles viraram R$ 800. O que você faria?",
    opcoes: ["Vendia tudo para não perder mais", "Vendia uma parte", "Esperava passar", "Colocava mais dinheiro"],
  },
  {
    campo: "nivel_declarado",
    texto: "Como você se descreve com investimentos?",
    opcoes: ["Nunca investi", "Só poupança ou CDB", "Já comprei ações, FIIs ou cripto", "Acompanho o mercado com frequência"],
  },
  {
    campo: "caminho",
    texto: "Você já tem investimentos que quer analisar aqui?",
    opcoes: ["Sim, quero importar o extrato", "Sim, prefiro digitar", "Não tenho ainda"],
  },
];

export const TOTAL_PERGUNTAS = PERGUNTAS.length;

export function proximaPergunta(respostas: Respostas): number {
  const i = PERGUNTAS.findIndex((p) => !respostas[p.campo]);
  return i === -1 ? TOTAL_PERGUNTAS : i;
}

export function opcaoValida(campo: CampoEntrevista, valor: string) {
  return PERGUNTAS.find((p) => p.campo === campo)?.opcoes.includes(valor) ?? false;
}

// --- Interpretação de respostas livres (sem IA) -------------------------------

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9$ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Palavras-chave extras por opção, para entender respostas como "uns 3 anos".
const SINONIMOS: Record<string, string[]> = {
  "Montar uma reserva para imprevistos": ["reserva", "emergencia", "imprevisto"],
  "Comprar algo (carro, imóvel, viagem)": ["carro", "casa", "imovel", "viagem", "comprar", "apartamento", "moto"],
  "Aposentadoria ou independência financeira": ["aposentar", "aposentadoria", "independencia", "liberdade", "futuro"],
  "Fazer meu dinheiro render mais": ["render", "rendimento", "multiplicar", "ganhar mais"],
  "Ainda não sei": ["nao sei", "sei la", "talvez"],
  "Até 2 anos": ["1 ano", "um ano", "2 anos", "dois anos", "meses", "curto"],
  "De 2 a 5 anos": ["3 anos", "tres anos", "4 anos", "quatro anos", "5 anos", "cinco anos", "medio"],
  "Mais de 5 anos": ["10 anos", "dez anos", "longo", "muitos anos", "decada"],
  Sim: ["sim", "tenho", "devo", "cartao", "cheque especial", "emprestimo"],
  Não: ["nao", "nenhuma", "zero", "nada"],
  "Prefiro não dizer": ["prefiro nao", "nao quero dizer"],
  "Vendia tudo para não perder mais": ["vendia tudo", "tirava tudo", "sacava tudo", "desespero"],
  "Vendia uma parte": ["uma parte", "metade", "um pouco"],
  "Esperava passar": ["esperava", "aguardava", "segurava", "nada", "esperar"],
  "Colocava mais dinheiro": ["colocava mais", "comprava mais", "aportava", "aproveitava"],
  "Nunca investi": ["nunca", "nao invisto", "nada"],
  "Só poupança ou CDB": ["poupanca", "cdb", "tesouro"],
  "Já comprei ações, FIIs ou cripto": ["acoes", "acao", "fii", "cripto", "bitcoin"],
  "Acompanho o mercado com frequência": ["acompanho", "todo dia", "trader", "experiente"],
  "Sim, quero importar o extrato": ["importar", "extrato", "pdf", "planilha", "arquivo"],
  "Sim, prefiro digitar": ["digitar", "manual"],
  "Não tenho ainda": ["nao tenho", "ainda nao"],
};

export function interpretarResposta(campo: CampoEntrevista, texto: string): string | null {
  const pergunta = PERGUNTAS.find((p) => p.campo === campo);
  if (!pergunta) return null;
  const t = normalizar(texto);
  if (!t) return null;

  const exata = pergunta.opcoes.find((o) => normalizar(o) === t);
  if (exata) return exata;

  const candidatas = pergunta.opcoes.filter((o) =>
    [normalizar(o), ...(SINONIMOS[o] ?? [])].some((chave) => t.includes(chave)),
  );
  return candidatas.length === 1 ? candidatas[0] : null;
}

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const CONTA = /\b(agencia|conta corrente|numero da conta|senha|cartao final)\b/;
const SAUDE = /\b(doenca|diagnostico|cancer|depressao|remedio|tratamento)\b/;
const PEDIDO_ATIVO = /\b(devo comprar|vale a pena comprar|compro|vendo|qual acao|me indica|indicacao|recomenda|em qual investir|onde investir)\b/;

export type AlertaTexto = "dado_sensivel" | "pedido_de_ativo" | null;

export function verificarTextoLivre(texto: string): AlertaTexto {
  const t = normalizar(texto);
  if (CPF.test(texto) || CONTA.test(t) || SAUDE.test(t)) return "dado_sensivel";
  if (PEDIDO_ATIVO.test(t)) return "pedido_de_ativo";
  return null;
}
