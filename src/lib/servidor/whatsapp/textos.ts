import { formatarData } from "@/lib/dominio/carteira";
import {
  nomeMes,
  type Categoria,
  type Lancamento,
  type ResumoMes,
} from "@/lib/dominio/financas";
import type { EnqueteSaida, LancamentoProposto } from "./tipos";

// Textos do Mordomo no WhatsApp. Negrito do WhatsApp é *assim*; sem títulos nem tabelas.

export const brl = (v: number, centavos = true) =>
  v
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: centavos ? 2 : 0,
      maximumFractionDigits: centavos ? 2 : 0,
    })
    .replace(/\s/g, " ");

const MEIOS: Record<string, string> = {
  pix: "Pix",
  debito: "débito",
  credito: "crédito",
  dinheiro: "dinheiro",
  boleto: "boleto",
  transferencia: "transferência",
};

export function site() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://findomo.com.br"
  ).replace(/\/$/, "");
}

// Respostas rápidas: o cliente toca no número em vez de digitar (o WhatsApp não
// mostra botões para números conectados fora da API oficial).
export function opcoes(itens: string[]) {
  return itens.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

export const OPCOES_CONFIRMAR = opcoes(["Confirmar", "Cancelar", "Corrigir"]);

export function enqueteConfirmar(pergunta = "Posso salvar?"): EnqueteSaida {
  return {
    pergunta,
    opcoes: [
      { rotulo: "Confirmar", valor: "sim" },
      { rotulo: "Cancelar", valor: "nao" },
      { rotulo: "Corrigir", valor: "corrigir" },
    ],
  };
}

export function enqueteSimNao(
  pergunta: string,
  sim: string,
  nao: string,
): EnqueteSaida {
  return {
    pergunta: pergunta.slice(0, 250),
    opcoes: [
      { rotulo: sim, valor: "sim" },
      { rotulo: nao, valor: "nao" },
    ],
  };
}

export function boasVindas(primeiroNome: string) {
  return [
    `Tudo certo${primeiroNome ? `, ${primeiroNome}` : ""}! Seu WhatsApp agora está conectado ao Findomo.\n\nA partir de agora, eu registro seus lançamentos e respondo suas dúvidas sobre dinheiro.`,
    MENU,
  ];
}

export const MENU = [
  "*Como posso ajudar?*",
  "",
  "*Lançar*",
  "\"gastei 85 no almoço no débito\", \"recebi 3.200 de salário\" ou uma foto da nota",
  "",
  "*Seu mês*",
  "\"resumo\" ou \"quanto gastei com mercado?\"",
  "",
  "*Seu plano*",
  "\"como está meu plano?\"",
  "",
  "*Investimentos e bolsa*",
  "\"minha carteira\", \"ações da Petrobras\" ou \"como está a bolsa?\"",
  "",
  "*Aprender*",
  "\"o que é CDB?\"",
  "",
  "*Corrigir*",
  "\"apagar o último\"",
  "",
  "É só escrever do seu jeito. Para desconectar, envie *SAIR*.",
].join("\n");

export function primeiraConversa(primeiroNome: string, comMenu: boolean) {
  const aviso = `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Que bom ter você por aqui.\n\nEste WhatsApp está conectado à sua conta Findomo.\n\nSe essa conta não for sua, envie *SAIR* e eu desconecto na hora.`;
  return comMenu ? [aviso, MENU] : [aviso];
}

export function ehSaudacao(texto: string) {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, " ")
    .trim();
  return /^(oi+|ola|opa|e ai|eai|hey|hello|bom dia|boa tarde|boa noite|tudo bem|oi tudo bem)( .{0,20})?$/.test(t) && t.length <= 30;
}

export function atendimentoPausado() {
  return `Olá! Nosso atendimento pelo WhatsApp está em uma pausa rápida e volta em instantes.\n\nEnquanto isso, tudo continua disponível em ${site()}`;
}

export function naoVinculado() {
  return [
    "Olá! Eu sou o *Mordomo do Findomo*, seu assistente de finanças pessoais e investimentos.",
    "Com o Findomo você:\n\n• Registra gastos e receitas por aqui mesmo, por texto ou foto da nota\n• Vê para onde vai o seu dinheiro, mês a mês\n• Cria planos e metas e acompanha cada passo\n• Organiza seus investimentos e acompanha a bolsa\n• Aprende a investir com aulas curtas e simulador",
    `É grátis e leva 1 minuto. Crie sua conta em ${site()}/cadastro e informe este celular.`,
    "Depois é só me enviar um *oi* que eu começo a cuidar de tudo.",
    `Já tem conta? Cadastre este número em ${site()}/conta/whatsapp`,
  ].join("\n\n");
}

export const CODIGO_INVALIDO =
  "Esse código expirou ou não existe.\n\nGere um novo em *Conta › WhatsApp* no site e me envie em até 15 minutos.";

export function propostaLancamento(
  l: LancamentoProposto,
  categorias: Categoria[],
  hoje: string,
) {
  const categoria =
    categorias.find((c) => c.id === l.categoriaId)?.nome ?? "Outros";
  const quando = l.data === hoje ? "hoje" : formatarData(l.data);
  const campos = [
    `Descrição: ${l.descricao}`,
    `Categoria: ${categoria}`,
    l.meio ? `Pagamento: ${MEIOS[l.meio]}` : null,
    l.parcelas > 1
      ? `Parcelas: ${l.parcelas}x de ${brl(l.valor / l.parcelas)}`
      : null,
    `Data: ${quando}`,
  ].filter(Boolean);
  return `*${l.tipo === "receita" ? "Receita" : "Despesa"}: ${brl(l.valor)}*\n\n${campos.join("\n")}\n\nConfirme na enquete abaixo.\n\nSe precisar ajustar, é só escrever, por exemplo: "valor 90", "foi ontem" ou "no pix".`;
}

export function lancamentoSalvo(
  l: LancamentoProposto,
  resumo: ResumoMes,
  categorias: Categoria[],
) {
  const nome = categorias.find((c) => c.id === l.categoriaId)?.nome ?? "Outros";
  const daCategoria =
    resumo.porCategoria.find((p) => p.categoriaId === l.categoriaId)?.total ??
    0;
  const mes = nomeMes(resumo.mes).toLowerCase();
  if (l.tipo === "receita")
    return `Receita salva com sucesso.\n\nEm ${mes} já entraram ${brl(resumo.receitas, false)}, e o saldo do mês está em *${brl(resumo.saldo, false)}*.`;
  return `Despesa salva com sucesso.\n\nEm ${mes} você já gastou ${brl(daCategoria, false)} com ${nome}.\n\nNo mês: entrou ${brl(resumo.receitas, false)} e saiu ${brl(resumo.despesas, false)}.`;
}

export function resumoDoMesTexto(
  resumo: ResumoMes,
  anterior: ResumoMes,
  categorias: Categoria[],
) {
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  if (!resumo.receitas && !resumo.despesas)
    return `Ainda não há lançamentos em ${nomeMes(resumo.mes).toLowerCase()}.\n\nVamos começar? Me envie o primeiro, por exemplo: "gastei 40 na farmácia".`;
  const topo = resumo.porCategoria
    .slice(0, 4)
    .map((p) => `• ${nome(p.categoriaId)}: ${brl(p.total, false)}`)
    .join("\n");
  const comparacao =
    anterior.despesas > 0
      ? `\n\n${nomeMes(anterior.mes)} fechou com ${brl(anterior.despesas, false)} de despesas.`
      : "";
  return `*Resumo de ${nomeMes(resumo.mes).toLowerCase()}*\n\nEntrou: ${brl(resumo.receitas, false)}\nSaiu: ${brl(resumo.despesas, false)}\nSaldo: *${brl(resumo.saldo, false)}*${topo ? `\n\n*Onde mais foi*\n${topo}` : ""}${comparacao}\n\nDetalhes em ${site()}/financas`;
}

export function ultimosTexto(lista: Lancamento[], categorias: Categoria[]) {
  if (!lista.length)
    return 'Você ainda não tem lançamentos.\n\nQue tal começar agora? Por exemplo: "gastei 40 na farmácia".';
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  return (
    "*Últimos lançamentos*\n\n" +
    lista
      .map(
        (l) =>
          `• ${formatarData(l.data)} ${l.tipo === "receita" ? "+" : "−"}${brl(l.valor)} ${l.descricao} (${nome(l.categoriaId)})`,
      )
      .join("\n")
  );
}

export function resumoLancamento(l: Lancamento) {
  return `${l.tipo === "receita" ? "receita" : "despesa"} de ${brl(l.valor)} (${l.descricao}, ${formatarData(l.data)})`;
}

export const SEM_IA_MIDIA =
  'Por enquanto ainda não consigo ler fotos por aqui.\n\nMe escreva o lançamento, por exemplo: "gastei 85 no almoço no débito".';
export const AUDIO_FALHOU =
  'Não consegui entender esse áudio.\n\nPode enviar de novo, falando mais perto do celular, ou escrever? Por exemplo: "gastei 85 no almoço no débito".';
export const SEM_AUDIO =
  'Os áudios chegam em breve por aqui.\n\nPor enquanto, me escreva, por exemplo: "gastei 85 no almoço no débito".';
export const MUITAS_MENSAGENS =
  "Recebi muitas mensagens em pouco tempo.\n\nDê uma pausa de alguns minutos e me chame de novo.";
export const ERRO_GERAL =
  "Tive uma instabilidade para responder agora.\n\nPode me enviar de novo em instantes?";

type ConteudoCarteira = {
  vazia?: boolean;
  link: string;
  patrimonio?: number;
  rendimento?: number;
  rentabilidadeAcumuladaPct?: number | null;
  porClasse?: { classe: string; total: number; pct: number }[];
  maiores?: { nome: string; saldo: number; pctCarteira: number }[];
};

export function textoCarteira(conteudo: unknown) {
  const c = conteudo as ConteudoCarteira;
  if (c.vazia || c.patrimonio == null)
    return `Sua carteira ainda está vazia no Findomo.\n\nCadastre seus investimentos em ${c.link} e eu acompanho tudo com você por aqui.`;
  const pctTxt =
    c.rentabilidadeAcumuladaPct != null
      ? ` (${c.rentabilidadeAcumuladaPct >= 0 ? "+" : "−"}${Math.abs(c.rentabilidadeAcumuladaPct).toFixed(1).replace(".", ",")}%)`
      : "";
  const blocos = [
    `*Sua carteira: ${brl(c.patrimonio)}*${c.rendimento != null ? `\nRendimento: ${brl(c.rendimento)}${pctTxt}` : ""}`,
    c.porClasse?.length
      ? `*Por classe*\n${c.porClasse.map((x) => `• ${x.classe}: ${brl(x.total)} (${x.pct}%)`).join("\n")}`
      : null,
    c.maiores?.length
      ? `*Maiores posições*\n${c.maiores.slice(0, 3).map((m) => `• ${m.nome}`).join("\n")}`
      : null,
    `Detalhes em ${c.link}`,
  ];
  return blocos.filter(Boolean).join("\n\n");
}
