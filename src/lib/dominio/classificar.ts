import type { Classe } from "./tipos";

// Classifica um ativo pelo nome ou código de negociação (regras da Tela 7).

// ETFs negociados na B3 (lista parcial, ampliar conforme necessário).
const ETFS_CRIPTO = new Set(["HASH11", "QBTC11", "QETH11", "BITH11", "ETHE11", "BITI11", "DEFI11", "WEB311", "NFTS11", "CRPT11", "SOLH11", "XRPH11", "QSOL11"]);
const ETFS_EXTERIOR = new Set(["IVVB11", "SPXI11", "NASD11", "WRLD11", "EURP11", "ACWI11", "XINA11", "ASIA11", "TECK11", "GOLD11", "USTK11", "BNDX11"]);
const ETFS_BRASIL = new Set(["BOVA11", "BOVV11", "SMAL11", "BRAX11", "DIVO11", "PIBB11", "FIND11", "ECOO11", "MATB11", "GOVE11", "BOVB11", "XBOV11", "IMAB11", "IRFM11", "FIXA11", "B5P211", "LFTS11", "DEBB11", "NTNS11"]);
// Units terminadas em 11 que são ações, não FIIs.
const UNITS = new Set(["TAEE11", "SANB11", "KLBN11", "ALUP11", "ENGI11", "BPAC11", "SAPR11", "TIET11", "CPLE11", "IGTI11", "SULA11", "BRBI11", "AESB11", "ENEV11", "RNEW11", "PPLA11", "BIDI11", "ITUB11", "CMIG11", "AZUL11"]);

const RENDA_FIXA = /\b(tesouro|ntn|lft|ltn|cdb|lci|lca|lc|lf|rdb|deb[eê]nture|debenture|cri|cra|lig|cdca|poupan[cç]a|renda fixa)\b/i;
const MULTIMERCADO = /\bmultimercado|macro|long ?short\b/i;
const CRIPTO = /\b(bitcoin|btc|ethereum|eth|solana|usdt|usdc|cripto|crypto|stablecoin)\b/i;
const FII = /\b(fii|fundo imobili[aá]rio|imobili[aá]rio)\b/i;
const EXTERIOR = /\b(bdr|reit|stock|exterior|internacional|global|nasdaq|s&p)\b/i;

export const REGEX_TICKER = /\b([A-Z]{4})(\d{1,2})F?\b/;

export function extrairTicker(texto: string): string | null {
  const m = texto.toUpperCase().match(REGEX_TICKER);
  return m ? `${m[1]}${m[2]}` : null;
}

export function classificar(texto: string, dica?: string): Classe | null {
  const ticker = extrairTicker(texto);
  const contexto = `${texto} ${dica ?? ""}`;

  if (ticker) {
    if (ETFS_CRIPTO.has(ticker)) return "cripto";
    if (ETFS_EXTERIOR.has(ticker)) return "exterior";
    // ETFs de renda fixa (títulos públicos e debêntures) contam como renda fixa.
    if (ETFS_BRASIL.has(ticker)) return /^(IMAB|IRFM|FIXA|B5P2|LFTS|DEBB|NTNS)/.test(ticker) ? "renda_fixa" : "acoes_etfs";
    if (UNITS.has(ticker)) return "acoes_etfs";
    const numero = Number(ticker.slice(4));
    if ([32, 33, 34, 35, 39].includes(numero)) return "acoes_etfs"; // BDRs → Ações e ETFs (regra do escopo)
    if ([3, 4, 5, 6, 7, 8].includes(numero)) return "acoes_etfs";
    if (numero === 11) {
      if (/etf/i.test(contexto)) return "acoes_etfs";
      return "fiis";
    }
  }

  if (RENDA_FIXA.test(contexto)) return "renda_fixa";
  if (CRIPTO.test(contexto)) return "cripto";
  if (FII.test(contexto)) return "fiis";
  if (MULTIMERCADO.test(contexto)) return "multimercado";
  if (EXTERIOR.test(contexto)) return "exterior";
  if (/\ba[cç](ao|ões|oes)\b|\betf\b/i.test(contexto)) return "acoes_etfs";
  return null;
}

// "1.234,56" → 1234.56 ; "1234.56" → 1234.56
export function lerNumeroBR(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  let t = valor.replace(/[R$\s]/g, "").trim();
  if (!t || t === "-") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // "1.528" = mil quinhentos e vinte e oito
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
