import { normalizar } from "@/lib/dominio/financas";

// Comandos que o Mordomo resolve sem IA (rápidos e sem custo). Puro, para os testes.

export type Comando =
  | { tipo: "codigo"; codigo: string }
  | { tipo: "sim" }
  | { tipo: "nao" }
  | { tipo: "corrigir" }
  | { tipo: "ajuda" }
  | { tipo: "sair" }
  | { tipo: "apagar_ultimo" }
  | { tipo: "resumo" }
  | { tipo: "ultimos" }
  | { tipo: "texto" };

const SIM = new Set([
  "sim",
  "s",
  "ss",
  "confirmo",
  "confirmar",
  "confirma",
  "ok",
  "pode",
  "isso",
  "isso mesmo",
  "certo",
  "correto",
  "beleza",
  "blz",
  "👍",
  "✅",
]);
const NAO = new Set([
  "nao",
  "n",
  "cancelar",
  "cancela",
  "deixa",
  "deixa pra la",
  "esquece",
  "❌",
]);
const AJUDA = new Set([
  "ajuda",
  "menu",
  "oi",
  "ola",
  "bom dia",
  "boa tarde",
  "boa noite",
  "comecar",
  "inicio",
  "help",
  "?",
]);
const SAIR = new Set(["sair", "desconectar", "desvincular", "parar", "stop"]);
const RESUMO = new Set([
  "resumo",
  "saldo",
  "extrato",
  "meu mes",
  "como estou",
  "como esta meu mes",
  "resumo do mes",
]);
const ULTIMOS = new Set([
  "ultimos",
  "ultimos lancamentos",
  "lancamentos",
  "historico",
]);

export function lerComando(texto: string): Comando {
  const bruto = texto.trim();
  const codigo = bruto.match(/^\s*(?:findomo\W*)?(\d{3})\W?(\d{3})\s*$/i);
  if (codigo) return { tipo: "codigo", codigo: codigo[1] + codigo[2] };
  const t = normalizar(bruto)
    .replace(/[!.?,;]+$/g, "")
    .trim();
  if (SIM.has(t) || SIM.has(bruto)) return { tipo: "sim" };
  if (NAO.has(t) || NAO.has(bruto)) return { tipo: "nao" };
  if (/^(corrigir|corrige|editar|alterar|mudar|errado)$/.test(t))
    return { tipo: "corrigir" };
  if (AJUDA.has(t)) return { tipo: "ajuda" };
  if (SAIR.has(t)) return { tipo: "sair" };
  if (
    /^(apagar|apaga|desfazer|desfaz|excluir|exclui|remover)( (o|a))?( ultim[oa]| ultimo lancamento)?$/.test(
      t,
    )
  )
    return { tipo: "apagar_ultimo" };
  if (RESUMO.has(t)) return { tipo: "resumo" };
  if (ULTIMOS.has(t)) return { tipo: "ultimos" };
  return { tipo: "texto" };
}

// Correções curtas de um lançamento proposto ("valor 90", "foi ontem", "no pix").
// Só vale quando a mensagem começa como correção; uma frase nova ("gastei 30 na
// farmácia") é outro lançamento.
const INICIO_CORRECAO =
  /^(valor|foi|era|e |na verdade|no |na |em |de |pelo |pela |categoria|ontem|hoje|anteontem|pix|debito|credito|cartao|dinheiro|boleto|receita|despesa|r\$|\d)/;

export function lerCorrecao(texto: string): {
  valor?: number;
  data?: "hoje" | "ontem" | "anteontem";
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "transferencia";
  tipo?: "despesa" | "receita";
} | null {
  const bruto = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!INICIO_CORRECAO.test(bruto)) return null;
  const t = normalizar(texto);
  const r: ReturnType<typeof lerCorrecao> = {};
  const v = bruto.match(
    /(?:^|valor|foi|era|e|verdade)\s*(?:de\s*)?(?:r\$)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/,
  );
  if (v)
    r.valor = Number(
      v[1].includes(",")
        ? v[1].replace(/\./g, "").replace(",", ".")
        : /^\d{1,3}(\.\d{3})+$/.test(v[1])
          ? v[1].replace(/\./g, "")
          : v[1],
    );
  if (/\banteontem\b/.test(t)) r.data = "anteontem";
  else if (/\bontem\b/.test(t)) r.data = "ontem";
  else if (/\bhoje\b/.test(t)) r.data = "hoje";
  if (/\bpix\b/.test(t)) r.meio = "pix";
  else if (/\bdebito\b/.test(t)) r.meio = "debito";
  else if (/\bcredito\b|\bcartao\b/.test(t)) r.meio = "credito";
  else if (/\bdinheiro\b|\bespecie\b/.test(t)) r.meio = "dinheiro";
  else if (/\bboleto\b/.test(t)) r.meio = "boleto";
  if (/\breceita\b/.test(t)) r.tipo = "receita";
  else if (/\bdespesa\b/.test(t)) r.tipo = "despesa";
  return Object.keys(r).length ? r : null;
}
