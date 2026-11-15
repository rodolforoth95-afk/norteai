// Entende perguntas sobre o mercado sem IA: empresa pelo nome ("Petrobras" → PETR4),
// código da B3, Ibovespa e os assuntos das telas Mercado e Radar.

const EMPRESAS: [RegExp, string][] = [
  [/petrobras|petrobr[aá]s/, "PETR4"],
  [/\bvale\b(?!\s*(a pena|o |refei|alimenta|transporte|-|presente|gas|g[aá]s))/, "VALE3"],
  [/itau|itaú/, "ITUB4"],
  [/bradesco/, "BBDC4"],
  [/banco do brasil/, "BBAS3"],
  [/santander/, "SANB11"],
  [/\bbtg\b/, "BPAC11"],
  [/nubank/, "ROXO34"],
  [/ambev/, "ABEV3"],
  [/magazine luiza|magalu/, "MGLU3"],
  [/\bweg\b/, "WEGE3"],
  [/\bb3\b/, "B3SA3"],
  [/eletrobras/, "ELET3"],
  [/suzano/, "SUZB3"],
  [/gerdau/, "GGBR4"],
  [/\bjbs\b/, "JBSS3"],
  [/embraer/, "EMBR3"],
  [/localiza/, "RENT3"],
  [/natura/, "NTCO3"],
  [/rede d.?or/, "RDOR3"],
  [/sabesp/, "SBSP3"],
  [/cemig/, "CMIG4"],
  [/copel/, "CPLE6"],
  [/taesa/, "TAEE11"],
  [/hapvida/, "HAPV3"],
  [/\bcsn\b/, "CSNA3"],
  [/usiminas/, "USIM5"],
  [/klabin/, "KLBN11"],
  [/totvs/, "TOTS3"],
  [/renner/, "LREN3"],
  [/casas bahia/, "BHIA3"],
  [/\bazul\b/, "AZUL4"],
  [/\bcosan\b/, "CSAN3"],
  [/ultrapar/, "UGPA3"],
  [/vibra/, "VBBR3"],
  [/\bprio\b|petrorio/, "PRIO3"],
  [/braskem/, "BRKM5"],
  [/marfrig/, "MRFG3"],
  [/\bbrf\b/, "BRFS3"],
  [/minerva/, "BEEF3"],
  [/assai|assaí/, "ASAI3"],
  [/carrefour/, "CRFB3"],
  [/equatorial/, "EQTL3"],
  [/engie/, "EGIE3"],
  [/telefonica|telefônica/, "VIVT3"],
  [/\btim\b/, "TIMS3"],
  [/raizen|raízen/, "RAIZ4"],
  [/\bsmart ?fit\b/, "SMFT3"],
  [/\bcielo\b/, "CIEL3"],
  [/\bbbseguridade|bb seguridade\b/, "BBSE3"],
  [/\bcaixa seguridade\b/, "CXSE3"],
];

const TICKER = /\b([A-Z]{4})(3|4|5|6|11|33|34)\b/g;

export type IntencaoMercado =
  | { tipo: "ativos"; simbolos: string[] }
  | { tipo: "mercado_hoje" }
  | { tipo: "cripto" }
  | { tipo: "tesouro" }
  | { tipo: "radar" }
  | { tipo: "buscar"; termo: string };

function semAcento(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function intencaoMercado(texto: string): IntencaoMercado | null {
  if (
    /\b(gastei|paguei|recebi|comprei|vendi|ganhei|transferi|r\$|reais)\b/i.test(
      texto,
    )
  )
    return null;
  const t = semAcento(texto);
  if (/\b(minha|meu|meus|minhas) (carteira|investimentos?|acoes|patrimonio)\b/.test(t))
    return null;

  const simbolos = new Set<string>();
  for (const m of texto.toUpperCase().matchAll(TICKER)) simbolos.add(`${m[1]}${m[2]}`);
  for (const [regra, simbolo] of EMPRESAS) if (regra.test(t)) simbolos.add(simbolo);
  if (simbolos.size) return { tipo: "ativos", simbolos: [...simbolos].slice(0, 3) };

  if (/bitcoin|cripto|ethereum|\bbtc\b|\beth\b/.test(t)) return { tipo: "cripto" };
  if (/tesouro/.test(t)) return { tipo: "tesouro" };
  if (/\b(agenda|radar)\b|o que (vai )?acontece(r)? (na|essa|nesta) semana/.test(t))
    return { tipo: "radar" };
  if (
    /ibovespa|\bibov\b|maiores (altas|baixas)|o que (subiu|caiu)|(como|que) (esta|ta|anda|fechou|foi) (a |o )?(bolsa|mercado)|mercado hoje|bolsa hoje/.test(
      t,
    )
  )
    return { tipo: "mercado_hoje" };

  const empresa = t.match(
    /\ba[cç]?(?:ao|oes) (?:da|do|de) ([a-z0-9 .&-]{3,30}?)(?:\?|$| hoje| agora| esta| ta)/,
  );
  if (empresa) return { tipo: "buscar", termo: empresa[1].trim() };
  return null;
}
