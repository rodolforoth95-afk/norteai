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
  const numeros = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
  return itens.map((t, i) => `${numeros[i]} ${t}`).join("\n");
}

export const OPCOES_CONFIRMAR = opcoes(["Confirmar", "Cancelar", "Corrigir"]);

export function enqueteConfirmar(pergunta = "Posso salvar?"): EnqueteSaida {
  return {
    pergunta,
    opcoes: [
      { rotulo: "✅ Confirmar", valor: "sim" },
      { rotulo: "❌ Cancelar", valor: "nao" },
      { rotulo: "✏️ Corrigir", valor: "corrigir" },
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
    `Tudo certo${primeiroNome ? `, ${primeiroNome}` : ""}! 🎉 Seu WhatsApp agora está conectado ao Findomo. A partir daqui, eu cuido dos seus lançamentos e respondo suas dúvidas sobre dinheiro.`,
    MENU,
  ];
}

export const MENU = [
  "*Como posso te ajudar hoje?* 🎩",
  "",
  "💸 *Lançar*: \"gastei 85 no almoço no débito\", \"recebi 3.200 de salário\" ou uma foto da nota",
  "📊 *Seu mês*: \"resumo\" ou \"quanto gastei com mercado?\"",
  "🎯 *Seu plano*: \"como está meu plano?\"",
  "📈 *Investimentos e bolsa*: \"minha carteira\", \"ações da Petrobras\", \"como está a bolsa?\"",
  "📚 *Aprender*: \"o que é CDB?\"",
  "↩️ *Corrigir*: \"apagar o último\"",
  "",
  "É só me escrever do seu jeito. Para desconectar, envie *SAIR*.",
].join("\n");

export function primeiraConversa(primeiroNome: string, comMenu: boolean) {
  const aviso = `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! 😊 Que bom ter você por aqui. Este WhatsApp está conectado à sua conta Findomo.\n\nSe essa conta não for sua, envie *SAIR* e eu desconecto na hora.`;
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
  return `Olá! 😊 Nosso atendimento pelo WhatsApp está em uma pausa rápida e volta em instantes. Enquanto isso, tudo continua disponível em ${site()}`;
}

export function naoVinculado() {
  return [
    "Olá! 👋 Eu sou o *Mordomo do Findomo*, seu assistente de finanças pessoais e investimentos. 🎩",
    "Com o Findomo você:",
    "💸 Anota gastos e receitas por aqui mesmo, por texto ou foto da nota\n📊 Vê para onde vai o seu dinheiro, mês a mês\n🎯 Cria planos e metas e acompanha cada passo\n📈 Organiza seus investimentos e acompanha a bolsa\n📚 Aprende a investir com aulas curtas e simulador",
    `É grátis e leva 1 minuto. Crie sua conta em ${site()}/cadastro e informe este celular. Depois é só me mandar um *oi* que eu começo a cuidar de tudo. 🚀`,
    `Já tem conta? Cadastre este número em ${site()}/conta/whatsapp.`,
  ].join("\n\n");
}

export const CODIGO_INVALIDO =
  "Esse código expirou ou não existe. 🙂 Gere um novo em *Conta › WhatsApp* no site e me envie em até 15 minutos.";

export function propostaLancamento(
  l: LancamentoProposto,
  categorias: Categoria[],
  hoje: string,
) {
  const categoria =
    categorias.find((c) => c.id === l.categoriaId)?.nome ?? "Outros";
  const quando = l.data === hoje ? "hoje" : formatarData(l.data);
  const partes = [
    `*${l.tipo === "receita" ? "Receita" : "Despesa"} ${brl(l.valor)}*`,
    l.descricao,
    categoria,
    l.meio ? MEIOS[l.meio] : null,
    l.parcelas > 1 ? `em ${l.parcelas}x de ${brl(l.valor / l.parcelas)}` : null,
    quando,
  ].filter(Boolean);
  return `📝 Entendi assim:\n${partes.join(" · ")}\n\nToque numa opção da enquete abaixo. Para ajustar, também pode escrever, por exemplo: "valor 90", "foi ontem" ou "no pix".`;
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
    return `Receita salva! ✅\nEm ${mes} já entraram ${brl(resumo.receitas, false)}, e o saldo do mês está em *${brl(resumo.saldo, false)}*.`;
  return `Despesa salva! ✅\nEm ${mes} você já gastou ${brl(daCategoria, false)} com ${nome}.\nNo mês: entrou ${brl(resumo.receitas, false)} · saiu ${brl(resumo.despesas, false)}.`;
}

export function resumoDoMesTexto(
  resumo: ResumoMes,
  anterior: ResumoMes,
  categorias: Categoria[],
) {
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  if (!resumo.receitas && !resumo.despesas)
    return `Ainda não há lançamentos em ${nomeMes(resumo.mes).toLowerCase()}. Vamos começar? 😊 Me envie o primeiro, por exemplo: "gastei 40 na farmácia".`;
  const topo = resumo.porCategoria
    .slice(0, 4)
    .map((p) => `• ${nome(p.categoriaId)}: ${brl(p.total, false)}`)
    .join("\n");
  const comparacao =
    anterior.despesas > 0
      ? `\n\n${nomeMes(anterior.mes)} fechou com ${brl(anterior.despesas, false)} de despesas.`
      : "";
  return `📊 *Resumo de ${nomeMes(resumo.mes).toLowerCase()}*\nEntrou: ${brl(resumo.receitas, false)}\nSaiu: ${brl(resumo.despesas, false)}\nSaldo: *${brl(resumo.saldo, false)}*${topo ? `\n\nOnde mais foi:\n${topo}` : ""}${comparacao}\n\nVeja os detalhes em ${site()}/financas`;
}

export function ultimosTexto(lista: Lancamento[], categorias: Categoria[]) {
  if (!lista.length)
    return 'Você ainda não tem lançamentos. Que tal começar agora? Ex.: "gastei 40 na farmácia" 😊';
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  return (
    "🧾 *Últimos lançamentos*\n" +
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
  'Por enquanto ainda não consigo ler fotos por aqui. 🙂 Me escreva o lançamento, por exemplo: "gastei 85 no almoço no débito".';
export const AUDIO_FALHOU =
  'Não consegui entender esse áudio. 🙂 Pode enviar de novo, falando mais perto do celular, ou escrever? Ex.: "gastei 85 no almoço no débito".';
export const SEM_AUDIO =
  'Os áudios chegam em breve por aqui! 🎧 Por enquanto, me escreva, por exemplo: "gastei 85 no almoço no débito".';
export const MUITAS_MENSAGENS =
  "Recebi muitas mensagens em pouco tempo. 🙂 Dê uma pausa de alguns minutos e me chame de novo.";
export const ERRO_GERAL =
  "Ops, tive uma instabilidade para responder agora. Pode me enviar de novo em instantes? 🙏";

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
    return `Sua carteira ainda está vazia no Findomo. 📈 Cadastre seus investimentos em ${c.link} e eu acompanho tudo com você por aqui.`;
  const pctTxt =
    c.rentabilidadeAcumuladaPct != null
      ? ` (${c.rentabilidadeAcumuladaPct >= 0 ? "+" : "−"}${Math.abs(c.rentabilidadeAcumuladaPct).toFixed(1).replace(".", ",")}%)`
      : "";
  return [
    `📈 *Sua carteira*: ${brl(c.patrimonio)}`,
    c.rendimento != null ? `Rendimento: ${brl(c.rendimento)}${pctTxt}` : null,
    ...(c.porClasse ?? []).map((x) => `• ${x.classe}: ${brl(x.total)} (${x.pct}%)`),
    c.maiores?.length
      ? `Maiores posições: ${c.maiores.slice(0, 3).map((m) => m.nome).join(", ")}`
      : null,
    `Detalhes em ${c.link}`,
  ]
    .filter(Boolean)
    .join("\n");
}
