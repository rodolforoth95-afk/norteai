import { formatarData } from "@/lib/dominio/carteira";
import {
  nomeMes,
  type Categoria,
  type Lancamento,
  type ResumoMes,
} from "@/lib/dominio/financas";
import type { LancamentoProposto } from "./tipos";

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
    process.env.NEXT_PUBLIC_SITE_URL || "https://norteai-delta.vercel.app"
  ).replace(/\/$/, "");
}

export function boasVindas(primeiroNome: string) {
  return [
    `Pronto${primeiroNome ? `, ${primeiroNome}` : ""}! Seu WhatsApp está ligado ao Findomo. 🎩`,
    MENU,
  ];
}

export const MENU = [
  "Aqui você pode:",
  '• *Lançar*: "gastei 85 no almoço no débito", "recebi 3.200 de salário", uma foto da nota ou um áudio',
  '• *Ver o mês*: "resumo" ou "quanto gastei com mercado?"',
  '• *Plano*: "como está meu plano?"',
  '• *Carteira e bolsa*: "minha carteira", "cotação PETR4", "como está a Selic?"',
  '• *Aprender*: "o que é CDB?"',
  '• *Corrigir*: "apagar o último"',
  "",
  "Para desligar o WhatsApp do Findomo, mande *SAIR*.",
].join("\n");

export function primeiraConversa(primeiroNome: string, comMenu: boolean) {
  const aviso = `Oi${primeiroNome ? `, ${primeiroNome}` : ""}! Este WhatsApp está ligado à sua conta do Findomo. 🎩\nSe essa conta não é sua, responda *SAIR*.`;
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
  return `O atendimento do Findomo pelo WhatsApp está em pausa por alguns instantes. Enquanto isso, use o site: ${site()}`;
}

export function naoVinculado() {
  return [
    "Olá! Eu sou o Mordomo do Findomo. 🎩",
    `Não encontrei este número em nenhuma conta. Para eu cuidar das suas finanças por aqui, cadastre este celular em ${site()}/conta/whatsapp e me mande uma mensagem de novo.`,
    `Ainda não tem conta? Crie grátis em ${site()}/cadastro.`,
  ].join("\n\n");
}

export const CODIGO_INVALIDO =
  "Esse código não vale mais ou não existe. Gere um novo em Conta › WhatsApp no site e me mande em até 15 minutos.";

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
  return `Anotei: ${partes.join(" · ")}.\n\nConfirma? Responda *sim*, *não* ou me diga o que corrigir (ex.: "valor 90", "foi ontem", "no pix").`;
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
    return `Feito ✅ Receita lançada. Em ${mes} entraram ${brl(resumo.receitas, false)} e sobram ${brl(resumo.saldo, false)}.`;
  return `Feito ✅ Em ${mes} você já gastou ${brl(daCategoria, false)} com ${nome}. No mês: entrou ${brl(resumo.receitas, false)}, saiu ${brl(resumo.despesas, false)}.`;
}

export function resumoDoMesTexto(
  resumo: ResumoMes,
  anterior: ResumoMes,
  categorias: Categoria[],
) {
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  if (!resumo.receitas && !resumo.despesas)
    return `Ainda não há lançamentos em ${nomeMes(resumo.mes).toLowerCase()}. Me mande o primeiro, por exemplo: "gastei 40 na farmácia".`;
  const topo = resumo.porCategoria
    .slice(0, 4)
    .map((p) => `• ${nome(p.categoriaId)}: ${brl(p.total, false)}`)
    .join("\n");
  const comparacao =
    anterior.despesas > 0
      ? `\n\n${nomeMes(anterior.mes)} fechou com ${brl(anterior.despesas, false)} de despesas.`
      : "";
  return `*${nomeMes(resumo.mes)}*\nEntrou: ${brl(resumo.receitas, false)}\nSaiu: ${brl(resumo.despesas, false)}\nSobra: *${brl(resumo.saldo, false)}*${topo ? `\n\nOnde mais foi:\n${topo}` : ""}${comparacao}`;
}

export function ultimosTexto(lista: Lancamento[], categorias: Categoria[]) {
  if (!lista.length) return "Você ainda não tem lançamentos.";
  const nome = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "Outros";
  return (
    "*Últimos lançamentos*\n" +
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
  'Por enquanto eu ainda não leio fotos e áudios por aqui. Me escreva o lançamento, por exemplo: "gastei 85 no almoço no débito".';
export const AUDIO_FALHOU =
  'Não consegui entender esse áudio. Pode mandar de novo, falando mais perto do celular, ou escrever? Ex.: "gastei 85 no almoço no débito".';
export const SEM_AUDIO =
  'Ainda não consigo ouvir áudios por aqui. Me escreva, por exemplo: "gastei 85 no almoço no débito".';
export const MUITAS_MENSAGENS =
  "Recebi muitas mensagens em pouco tempo. Dê uma pausa de alguns minutos e me chame de novo.";
export const ERRO_GERAL =
  "Tive um problema para responder agora. Pode mandar de novo em instantes?";
