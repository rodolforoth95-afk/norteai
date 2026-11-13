// Fluxo de caixa pessoal (receitas e despesas) do "Mordomo das Finanças".
// Tudo aqui é puro: roda igual no navegador e no servidor. Inclui as categorias padrão,
// o aprendizado por estabelecimento, a leitura local de frases ("gastei 85 no almoço"),
// os resumos do mês, o diagnóstico de "ralos" e o plano de economia para reinvestir.

export type TipoLancamento = "despesa" | "receita";
export type GrupoCategoria = "fixa" | "variavel" | "receita";
export type Meio = "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "transferencia";
export type OrigemLancamento = "manual" | "foto" | "audio" | "exemplo";

export type Categoria = {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  grupo: GrupoCategoria;
  cor: string;
  icone: string; // nome do ícone (lucide)
  paiId: string | null; // subcategoria
  padrao: boolean;
  essencial: boolean; // custo fixo/essencial: o plano nunca sugere corte aqui
};

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  valor: number; // sempre positivo
  data: string; // AAAA-MM-DD
  descricao: string;
  estabelecimento: string | null;
  categoriaId: string;
  meio: Meio | null;
  parcela: { atual: number; total: number; grupo: string } | null;
  recorrente: boolean; // repete todo mês a partir da data
  fimRecorrencia: string | null; // AAAA-MM (último mês)
  origem: OrigemLancamento;
  criado_em: string;
};

// Aprendizado: estabelecimento normalizado → categoria escolhida pela pessoa.
export type Regra = { chave: string; categoriaId: string; usos: number; atualizada_em: string };

export type CorteCategoria = { categoriaId: string; mediaMensal: number; percentual: number; corteMensal: number; limiteMensal: number };

export type MetaEconomia = {
  id: string;
  nome: string;
  destino: string; // ex.: "FIIs", "Renda fixa", "Reserva"
  valorMensal: number;
  meses: number;
  inicio: string; // AAAA-MM
  cortes: CorteCategoria[];
  ativa: boolean;
  criada_em: string;
};

export type FinancasDados = {
  versao: 1;
  categorias: Categoria[];
  lancamentos: Lancamento[];
  regras: Regra[];
  metas: MetaEconomia[];
  atualizada_em: string;
};

// --- Categorias padrão ---------------------------------------------------------------

const c = (id: string, nome: string, tipo: TipoLancamento, grupo: GrupoCategoria, cor: string, icone: string, essencial = false): Categoria => ({
  id,
  nome,
  tipo,
  grupo,
  cor,
  icone,
  paiId: null,
  padrao: true,
  essencial,
});

export const CATEGORIAS_PADRAO: Categoria[] = [
  c("moradia", "Moradia", "despesa", "fixa", "#2D5BFF", "Home", true),
  c("contas", "Contas da casa", "despesa", "fixa", "#5B7FFF", "Zap", true),
  c("mercado", "Mercado", "despesa", "variavel", "#14B8A6", "ShoppingCart", true),
  c("alimentacao", "Restaurantes", "despesa", "variavel", "#F59E0B", "UtensilsCrossed"),
  c("delivery", "Delivery", "despesa", "variavel", "#FF8A3D", "Bike"),
  c("transporte", "Transporte", "despesa", "variavel", "#0EA5E9", "Car"),
  c("saude", "Saúde", "despesa", "fixa", "#22C55E", "HeartPulse", true),
  c("educacao", "Educação", "despesa", "fixa", "#8B5CF6", "GraduationCap", true),
  c("lazer", "Lazer", "despesa", "variavel", "#EC4899", "PartyPopper"),
  c("compras", "Compras", "despesa", "variavel", "#F472B6", "ShoppingBag"),
  c("assinaturas", "Assinaturas", "despesa", "variavel", "#A78BFA", "Repeat"),
  c("cuidados", "Cuidados pessoais", "despesa", "variavel", "#FB7185", "Sparkles"),
  c("dividas", "Dívidas e tarifas", "despesa", "fixa", "#EF4444", "CreditCard", true),
  c("outros", "Outros gastos", "despesa", "variavel", "#94A3B8", "CircleEllipsis"),
  c("salario", "Salário", "receita", "receita", "#34D399", "Briefcase"),
  c("extra", "Renda extra", "receita", "receita", "#10B981", "HandCoins"),
  c("passiva", "Renda passiva", "receita", "receita", "#7C9BFF", "TrendingUp"),
  c("outras-receitas", "Outras receitas", "receita", "receita", "#64748B", "Plus"),
];

export function financasVazias(): FinancasDados {
  return { versao: 1, categorias: CATEGORIAS_PADRAO.map((x) => ({ ...x })), lancamentos: [], regras: [], metas: [], atualizada_em: new Date().toISOString() };
}

// Palavras que indicam a categoria quando ainda não há regra aprendida.
const PALAVRAS: [RegExp, string][] = [
  [/\b(aluguel|condom[ií]nio|iptu|financiamento imob)/i, "moradia"],
  [/\b(luz|energia|enel|light|cemig|copel|[aá]gua|sabesp|g[aá]s|internet|vivo|claro|tim|oi fibra|net)\b/i, "contas"],
  [/\b(mercado|supermercado|carrefour|p[aã]o de a[cç][uú]car|assa[ií]|atacad|hortifruti|feira|padaria)/i, "mercado"],
  [/\b(ifood|rappi|uber eats|delivery|ze delivery|z[eé] delivery)\b/i, "delivery"],
  [/\b(restaurante|almo[cç]o|jantar|lanche|caf[eé]|bar\b|pizza|hamb[uú]rguer|sushi|starbucks|mc ?donald|burger)/i, "alimentacao"],
  [/\b(uber|99|99pop|taxi|t[aá]xi|posto|gasolina|combust[ií]vel|ipiranga|shell|petrobras br|estacionamento|ped[aá]gio|metr[oô]|[oô]nibus)\b/i, "transporte"],
  [/\b(farm[aá]cia|drogaria|droga ?raia|drogasil|m[eé]dico|consulta|exame|plano de sa[uú]de|dentista|academia|smart ?fit)\b/i, "saude"],
  [/\b(escola|faculdade|curso|udemy|alura|livro|mensalidade escolar)\b/i, "educacao"],
  [/\b(cinema|show|ingresso|viagem|hotel|airbnb|passeio|parque|balada)\b/i, "lazer"],
  [/\b(netflix|spotify|prime video|amazon prime|disney|hbo|max\b|youtube premium|apple|icloud|google one|globoplay|deezer|chatgpt|assinatura)\b/i, "assinaturas"],
  [/\b(amazon|mercado livre|shopee|shein|magalu|renner|riachuelo|zara|loja|roupa|t[eê]nis)\b/i, "compras"],
  [/\b(sal[aã]o|cabeleireiro|barbearia|manicure|perfumaria|botic[aá]rio|natura)\b/i, "cuidados"],
  [/\b(juros|tarifa|anuidade|empr[eé]stimo|parcela do carro|iof|multa)\b/i, "dividas"],
  [/\b(sal[aá]rio|holerite|pagamento da empresa|pro labore|pr[oó]-labore)\b/i, "salario"],
  [/\b(dividendo|jcp|juros sobre capital|rendimento|aluguel de fii|cupom)\b/i, "passiva"],
  [/\b(freela|freelance|venda|bico|comiss[aã]o|b[oô]nus|reembolso)\b/i, "extra"],
];

export function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Chave do aprendizado: as duas primeiras palavras relevantes do estabelecimento
// ("POSTO IPIRANGA 1234 SP" → "posto ipiranga").
export function chaveEstabelecimento(texto: string) {
  const palavras = normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 1 && !/^\d+$/.test(p) && !["de", "da", "do", "das", "dos", "e", "ltda", "me", "sa", "eireli", "com", "br"].includes(p));
  return palavras.slice(0, 2).join(" ");
}

// Categoria sugerida: primeiro o que a pessoa já ensinou, depois as palavras-chave.
export function sugerirCategoria(texto: string, tipo: TipoLancamento, dados: Pick<FinancasDados, "regras" | "categorias">): { categoriaId: string; aprendida: boolean } {
  const chave = chaveEstabelecimento(texto);
  const regra = chave ? dados.regras.find((r) => r.chave === chave || (chave.length >= 4 && (r.chave.startsWith(chave) || chave.startsWith(r.chave)))) : undefined;
  if (regra && dados.categorias.some((x) => x.id === regra.categoriaId && x.tipo === tipo)) return { categoriaId: regra.categoriaId, aprendida: true };
  for (const [re, id] of PALAVRAS) {
    const cat = dados.categorias.find((x) => x.id === id);
    if (re.test(texto) && cat && cat.tipo === tipo) return { categoriaId: id, aprendida: false };
  }
  return { categoriaId: tipo === "receita" ? "outras-receitas" : "outros", aprendida: false };
}

export function aprender(regras: Regra[], texto: string, categoriaId: string): Regra[] {
  const chave = chaveEstabelecimento(texto);
  if (!chave) return regras;
  const agora = new Date().toISOString();
  const existente = regras.find((r) => r.chave === chave);
  if (existente) return regras.map((r) => (r.chave === chave ? { ...r, categoriaId, usos: r.categoriaId === categoriaId ? r.usos + 1 : 1, atualizada_em: agora } : r));
  return [...regras, { chave, categoriaId, usos: 1, atualizada_em: agora }].slice(-500);
}

// --- Leitura local de frases (quando a IA não está ligada) ------------------------------

export type Interpretacao = {
  tipo: TipoLancamento;
  valor: number | null;
  data: string;
  descricao: string;
  estabelecimento: string | null;
  meio: Meio | null;
  parcelas: number;
};

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, quinze: 15, vinte: 20, trinta: 30, cinquenta: 50, cem: 100 };

function deslocarDias(hoje: string, dias: number) {
  const d = new Date(`${hoje}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// "Gastei 85 reais no almoço hoje no débito", "Recebi 5 mil de dividendos",
// "paguei 1.200,50 de aluguel ontem no pix", "comprei um tênis de 600 em 3x no crédito".
export function interpretarFrase(frase: string, hoje: string): Interpretacao {
  const t = frase
    .replace(/(\d)\.(\d{3})/g, "$1$2")
    .replace(/(\d),(\d{1,2})\b/g, "$1.$2")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const original = frase.trim();
  const tipo: TipoLancamento = /\b(recebi|ganhei|entrou|caiu|salario|dividendo|rendimento|reembolso|vendi|pagaram|recebimento)\b/.test(t) ? "receita" : "despesa";

  let valor: number | null = null;
  const semDatas = t.replace(/\bdia \d{1,2}\b/g, " ").replace(/\b\d{1,2}\s*(?:x|vezes|parcelas)\b/g, " ").replace(/\b99 ?pop\b|\b99\b(?= (?:taxi|corrida|app))/g, " ");
  const comMil = semDatas.match(/(\d+(?:\.\d+)?)\s*(mil|k)\b/);
  const comReais = semDatas.match(/(\d+(?:\.\d{1,2})?)/);
  if (comMil) valor = Number(comMil[1]) * 1000;
  else if (comReais) valor = Number(comReais[1]);
  else {
    const extenso = semDatas.split(" ").find((p) => NUMEROS[p]);
    if (extenso) valor = NUMEROS[extenso] * (/\bmil\b/.test(t) ? 1000 : 1);
  }

  let data = hoje;
  if (/\banteontem\b/.test(t)) data = deslocarDias(hoje, -2);
  else if (/\bontem\b/.test(t)) data = deslocarDias(hoje, -1);
  const dia = t.match(/\bdia (\d{1,2})\b/);
  if (dia) {
    const n = Number(dia[1]);
    if (n >= 1 && n <= 31) {
      const alvo = `${hoje.slice(0, 8)}${String(n).padStart(2, "0")}`;
      data = alvo > hoje ? (() => { const d = new Date(`${alvo}T12:00:00`); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })() : alvo;
    }
  }

  const meio: Meio | null = /\bpix\b/.test(t)
    ? "pix"
    : /\b(credito|cartao de credito|no cartao)\b/.test(t)
      ? "credito"
      : /\bdebito\b/.test(t)
        ? "debito"
        : /\b(dinheiro|especie)\b/.test(t)
          ? "dinheiro"
          : /\bboleto\b/.test(t)
            ? "boleto"
            : /\b(transferencia|ted|doc)\b/.test(t)
              ? "transferencia"
              : null;

  const parc = t.match(/\b(\d{1,2})\s*(?:x|vezes|parcelas)\b/);
  const parcelas = parc ? Math.min(48, Math.max(1, Number(parc[1]))) : 1;

  // O que vem depois de "no/na/em/de" costuma ser o lugar ou o motivo.
  const limpo = original
    .replace(/\b(hoje|ontem|anteontem)\b/gi, "")
    .replace(/\bno (d[eé]bito|cr[eé]dito|pix|cart[aã]o( de cr[eé]dito)?|dinheiro|boleto)\b/gi, "")
    .replace(/\bem \d{1,2} ?(x|vezes|parcelas)\b/gi, "")
    .replace(/\bdia \d{1,2}\b/gi, "");
  const lugar = limpo.match(/\b(?:no|na|nos|nas|em|com|de|do|da)\s+([A-Za-zÀ-ú][A-Za-zÀ-ú0-9 '&-]{1,40})/);
  const descricao = (lugar?.[1] ?? limpo.replace(/\b(gastei|paguei|comprei|recebi|ganhei|reais|real)\b|r\$/gi, "").replace(/[\d.,]+/g, ""))
    .replace(/\b(reais|real|conto|contos)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(de|do|da|no|na|em|com)$/i, "")
    .replace(/^(um|uma|o|a|os|as)\s+/i, "")
    .replace(/^./, (x) => x.toUpperCase())
    .slice(0, 60);
  return { tipo, valor: valor && valor > 0 ? Math.round(valor * 100) / 100 : null, data, descricao: descricao || (tipo === "receita" ? "Receita" : "Despesa"), estabelecimento: lugar ? descricao : null, meio, parcelas };
}

// --- Ocorrências por mês (parcelas e recorrências) ---------------------------------------

export function mesDe(data: string) {
  return data.slice(0, 7);
}

export function somarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nomeMes(mes: string, curto = false) {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", curto ? { month: "short" } : { month: "long", year: "numeric" }).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type Ocorrencia = Lancamento & { mes: string; virtual: boolean; dataBase: string };

// Lançamentos que contam num mês: os do próprio mês e as recorrências de meses anteriores.
export function ocorrenciasDoMes(lancamentos: Lancamento[], mes: string): Ocorrencia[] {
  const lista: Ocorrencia[] = [];
  for (const l of lancamentos) {
    const origem = mesDe(l.data);
    if (origem === mes) lista.push({ ...l, mes, virtual: false, dataBase: l.data });
    else if (l.recorrente && origem < mes && (!l.fimRecorrencia || l.fimRecorrencia >= mes)) {
      const dia = Math.min(Number(l.data.slice(8, 10)), new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate());
      lista.push({ ...l, mes, data: `${mes}-${String(dia).padStart(2, "0")}`, virtual: true, dataBase: l.data });
    }
  }
  return lista.sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em));
}

export type ResumoMes = {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number; // receitas − despesas
  fixas: number;
  variaveis: number;
  porCategoria: { categoriaId: string; total: number }[];
};

export function resumoDoMes(dados: Pick<FinancasDados, "lancamentos" | "categorias">, mes: string): ResumoMes {
  const ocorr = ocorrenciasDoMes(dados.lancamentos, mes);
  const porCat = new Map<string, number>();
  let receitas = 0;
  let despesas = 0;
  let fixas = 0;
  for (const o of ocorr) {
    if (o.tipo === "receita") receitas += o.valor;
    else {
      despesas += o.valor;
      const cat = dados.categorias.find((x) => x.id === o.categoriaId);
      if (cat?.essencial) fixas += o.valor;
      porCat.set(o.categoriaId, (porCat.get(o.categoriaId) ?? 0) + o.valor);
    }
  }
  return {
    mes,
    receitas: arred(receitas),
    despesas: arred(despesas),
    saldo: arred(receitas - despesas),
    fixas: arred(fixas),
    variaveis: arred(despesas - fixas),
    porCategoria: [...porCat.entries()].map(([categoriaId, total]) => ({ categoriaId, total: arred(total) })).sort((a, b) => b.total - a.total),
  };
}

export function serieDeMeses(dados: Pick<FinancasDados, "lancamentos" | "categorias">, mesFinal: string, quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) => resumoDoMes(dados, somarMeses(mesFinal, i - quantidade + 1)));
}

// --- Diagnóstico ("ralos") e plano de economia -------------------------------------------

export type Ralo = { categoriaId: string; mediaMensal: number; pctDespesas: number; motivo: string };

export type Diagnostico = {
  meses: string[];
  receitaMedia: number;
  despesaMedia: number;
  sobraMedia: number;
  fixasMedia: number;
  variaveisMedia: number;
  ralos: Ralo[];
  assinaturas: { descricao: string; valorMensal: number }[];
  mediasPorCategoria: { categoriaId: string; media: number; essencial: boolean }[];
};

// Quanto cada categoria variável aguenta cortar sem mexer no essencial.
const CORTE_MAXIMO: Record<string, number> = { delivery: 0.5, alimentacao: 0.35, lazer: 0.4, compras: 0.4, assinaturas: 0.5, cuidados: 0.25, transporte: 0.2, outros: 0.3 };

export function diagnosticar(dados: Pick<FinancasDados, "lancamentos" | "categorias">, mesAtual: string, dias: 30 | 60 | 90): Diagnostico {
  const quantidade = dias / 30;
  // Usa os meses fechados; sem histórico suficiente, inclui o mês atual.
  let meses = Array.from({ length: quantidade }, (_, i) => somarMeses(mesAtual, i - quantidade));
  const temDados = meses.some((m) => ocorrenciasDoMes(dados.lancamentos, m).length);
  if (!temDados) meses = Array.from({ length: quantidade }, (_, i) => somarMeses(mesAtual, i - quantidade + 1));
  const resumos = meses.map((m) => resumoDoMes(dados, m)).filter((r) => r.receitas + r.despesas > 0);
  const n = Math.max(1, resumos.length);
  const media = (f: (r: ResumoMes) => number) => arred(resumos.reduce((s, r) => s + f(r), 0) / n);

  const totais = new Map<string, number>();
  for (const r of resumos) for (const pc of r.porCategoria) totais.set(pc.categoriaId, (totais.get(pc.categoriaId) ?? 0) + pc.total);
  const despesaMedia = media((r) => r.despesas);
  const mediasPorCategoria = [...totais.entries()]
    .map(([categoriaId, total]) => ({ categoriaId, media: arred(total / n), essencial: Boolean(dados.categorias.find((x) => x.id === categoriaId)?.essencial) }))
    .sort((a, b) => b.media - a.media);

  const ralos: Ralo[] = mediasPorCategoria
    .filter((m) => !m.essencial && m.media > 0)
    .map((m) => {
      const pct = despesaMedia > 0 ? (m.media / despesaMedia) * 100 : 0;
      const nome = dados.categorias.find((x) => x.id === m.categoriaId)?.nome ?? "Outros";
      const motivo =
        m.categoriaId === "delivery"
          ? `${nome} costuma custar bem mais que cozinhar: é o corte com menos impacto no dia a dia.`
          : m.categoriaId === "assinaturas"
            ? "Serviços que cobram todo mês, mesmo quando ninguém usa."
            : pct >= 12
              ? `${nome} leva ${pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do que você gasta.`
              : `Gasto variável: dá para ajustar sem mexer nas contas fixas.`;
      return { categoriaId: m.categoriaId, mediaMensal: m.media, pctDespesas: pct, motivo };
    })
    .filter((r) => r.pctDespesas >= 4 || ["delivery", "assinaturas"].includes(r.categoriaId))
    .slice(0, 5);

  // Assinaturas: recorrentes da categoria assinaturas ou repetidas com o mesmo valor todo mês.
  const assinaturas = new Map<string, number>();
  for (const l of dados.lancamentos) {
    if (l.tipo === "despesa" && (l.categoriaId === "assinaturas" || (l.recorrente && !dados.categorias.find((x) => x.id === l.categoriaId)?.essencial))) {
      assinaturas.set(l.estabelecimento || l.descricao, l.valor);
    }
  }

  return {
    meses: resumos.map((r) => r.mes),
    receitaMedia: media((r) => r.receitas),
    despesaMedia,
    sobraMedia: media((r) => r.saldo),
    fixasMedia: media((r) => r.fixas),
    variaveisMedia: media((r) => r.variaveis),
    ralos,
    assinaturas: [...assinaturas.entries()].map(([descricao, valorMensal]) => ({ descricao, valorMensal })).slice(0, 8),
    mediasPorCategoria,
  };
}

export type Plano = {
  metaMensal: number;
  sobraAtual: number;
  faltaCortar: number; // quanto precisa sair das despesas além da sobra atual
  cortes: CorteCategoria[];
  cortado: number;
  atingivel: boolean;
  totalNoPeriodo: number;
};

// Distribui o corte necessário entre as categorias variáveis, das maiores para as menores,
// respeitando o limite de cada uma. Nunca sugere corte em categoria essencial.
export function planejar(diag: Diagnostico, metaMensal: number, meses: number): Plano {
  const sobraAtual = Math.max(0, diag.sobraMedia);
  const faltaCortar = Math.max(0, arred(metaMensal - sobraAtual));
  const candidatas = diag.mediasPorCategoria
    .filter((m) => !m.essencial && m.media > 0)
    .map((m) => ({ ...m, maximo: m.media * (CORTE_MAXIMO[m.categoriaId] ?? 0.2) }))
    .sort((a, b) => b.maximo - a.maximo);
  const capacidade = candidatas.reduce((s, x) => s + x.maximo, 0);
  const fator = capacidade > 0 ? Math.min(1, faltaCortar / capacidade) : 0;

  const cortes: CorteCategoria[] = candidatas
    .map((x) => {
      const corte = Math.round((x.maximo * fator) / 5) * 5;
      return {
        categoriaId: x.categoriaId,
        mediaMensal: x.media,
        percentual: x.media > 0 ? Math.round((corte / x.media) * 100) : 0,
        corteMensal: corte,
        limiteMensal: Math.max(0, Math.round((x.media - corte) / 10) * 10),
      };
    })
    .filter((x) => x.corteMensal > 0);
  const cortado = cortes.reduce((s, x) => s + x.corteMensal, 0);
  return {
    metaMensal,
    sobraAtual,
    faltaCortar,
    cortes,
    cortado,
    atingivel: sobraAtual + cortado >= metaMensal - 1,
    totalNoPeriodo: arred(metaMensal * meses),
  };
}

// Progresso da meta: a sobra de cada mês desde o início (sem passar da meta mensal) e o que já foi aportado.
export function progressoMeta(dados: Pick<FinancasDados, "lancamentos" | "categorias">, meta: MetaEconomia, mesAtual: string, aportesPorMes: Record<string, number>) {
  const meses: { mes: string; sobra: number; aportado: number }[] = [];
  for (let i = 0; i < meta.meses; i++) {
    const mes = somarMeses(meta.inicio, i);
    if (mes > mesAtual) break;
    const r = resumoDoMes(dados, mes);
    meses.push({ mes, sobra: Math.max(0, r.saldo), aportado: aportesPorMes[mes] ?? 0 });
  }
  const economizado = arred(meses.reduce((s, m) => s + m.sobra, 0));
  const aportado = arred(meses.reduce((s, m) => s + m.aportado, 0));
  const objetivo = arred(meta.valorMensal * meta.meses);
  const esperadoAteAgora = arred(meta.valorMensal * meses.length);
  return {
    meses,
    economizado,
    aportado,
    livreParaAportar: arred(Math.max(0, economizado - aportado)),
    objetivo,
    esperadoAteAgora,
    pct: objetivo > 0 ? Math.min(100, (economizado / objetivo) * 100) : 0,
    mesesPassados: meses.length,
  };
}

// --- Orçamento e insights do Mordomo -----------------------------------------------------

export type ItemOrcamento = { categoriaId: string; limite: number; gasto: number; pct: number; estado: "ok" | "atencao" | "estourou" };

export function orcamentoDoMes(resumo: ResumoMes, meta: MetaEconomia | null): ItemOrcamento[] {
  if (!meta) return [];
  return meta.cortes.map((cte) => {
    const gasto = resumo.porCategoria.find((p) => p.categoriaId === cte.categoriaId)?.total ?? 0;
    const pct = cte.limiteMensal > 0 ? (gasto / cte.limiteMensal) * 100 : gasto > 0 ? 100 : 0;
    return { categoriaId: cte.categoriaId, limite: cte.limiteMensal, gasto, pct, estado: pct >= 100 ? "estourou" : pct >= 80 ? "atencao" : "ok" };
  });
}

export type Insight = { id: string; tom: "positivo" | "atencao" | "alerta" | "neutro"; titulo: string; texto: string; acao?: { rotulo: string; href: string } };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function insights(params: { resumo: ResumoMes; anterior: ResumoMes; orcamento: ItemOrcamento[]; meta: MetaEconomia | null; livreParaAportar: number; categorias: Categoria[]; hoje: string }): Insight[] {
  const { resumo, anterior, orcamento, meta, livreParaAportar, categorias, hoje } = params;
  const lista: Insight[] = [];
  const nome = (id: string) => categorias.find((x) => x.id === id)?.nome ?? "Outros";
  const ultimoDia = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).getDate();
  const diasRestantes = ultimoDia - Number(hoje.slice(8, 10));
  const domingo = 7 - new Date(`${hoje}T12:00:00`).getDay();

  for (const o of orcamento.filter((x) => x.estado !== "ok").sort((a, b) => b.pct - a.pct).slice(0, 2)) {
    if (o.estado === "estourou") {
      lista.push({
        id: `estourou-${o.categoriaId}`,
        tom: "alerta",
        titulo: `${nome(o.categoriaId)} passou do combinado`,
        texto: `Foram ${brl(o.gasto)} de ${brl(o.limite)} planejados. Compensar em outra categoria até o fim do mês mantém o aporte de ${meta ? brl(meta.valorMensal) : "este mês"}.`,
        acao: { rotulo: "Ver plano", href: "/financas/plano" },
      });
    } else {
      lista.push({
        id: `atencao-${o.categoriaId}`,
        tom: "atencao",
        titulo: `${Math.round(o.pct)}% do orçamento de ${nome(o.categoriaId).toLowerCase()} usado`,
        texto: `Restam ${brl(Math.max(0, o.limite - o.gasto))} para ${diasRestantes} dias. Segurando os gastos ${domingo <= 1 ? "até amanhã" : "até domingo"}, o aporte extra continua garantido.`,
      });
    }
  }
  if (livreParaAportar >= 50) {
    lista.push({
      id: "aportar",
      tom: "positivo",
      titulo: `${brl(livreParaAportar)} prontos para investir`,
      texto: `É o que sobrou da sua meta ${meta ? `“${meta.nome}”` : ""} e ainda não foi aportado. Registrar o aporte deixa a carteira e o plano em dia.`,
      acao: { rotulo: "Registrar aporte", href: "/carteira/adicionar" },
    });
  }
  const top = resumo.porCategoria[0];
  const topAntes = top ? anterior.porCategoria.find((p) => p.categoriaId === top.categoriaId)?.total ?? 0 : 0;
  if (top && topAntes > 0 && top.total > topAntes * 1.25 && !categorias.find((x) => x.id === top.categoriaId)?.essencial) {
    lista.push({
      id: "subiu",
      tom: "atencao",
      titulo: `${nome(top.categoriaId)} subiu ${Math.round((top.total / topAntes - 1) * 100)}% em relação ao mês passado`,
      texto: `Foram ${brl(top.total)} contra ${brl(topAntes)}. Vale olhar os lançamentos dessa categoria.`,
    });
  }
  if (!meta && resumo.saldo > 0) {
    lista.push({
      id: "sem-meta",
      tom: "neutro",
      titulo: `Este mês sobraram ${brl(resumo.saldo)}`,
      texto: "Com uma meta de aporte, eu separo um valor fixo todo mês e mostro onde ajustar para chegar lá.",
      acao: { rotulo: "Criar plano", href: "/financas/plano" },
    });
  }
  if (resumo.saldo < 0) {
    lista.push({
      id: "negativo",
      tom: "alerta",
      titulo: `Saídas maiores que entradas em ${brl(Math.abs(resumo.saldo))}`,
      texto: "Antes de pensar em aportes, o primeiro passo é zerar essa diferença. O plano do Mordomo mostra onde dá para cortar.",
      acao: { rotulo: "Ver diagnóstico", href: "/financas/plano" },
    });
  }
  return lista.slice(0, 3);
}

function arred(v: number) {
  return Math.round(v * 100) / 100;
}

// --- Dados de exemplo (para testar a experiência) ---------------------------------------

export function exemploFinancas(hoje: string, novoId: () => string): Lancamento[] {
  const mesAtual = mesDe(hoje);
  const criado = new Date().toISOString();
  const lista: Lancamento[] = [];
  const add = (tipo: TipoLancamento, mes: string, dia: number, valor: number, descricao: string, categoriaId: string, meio: Meio | null, extra: Partial<Lancamento> = {}) => {
    const data = `${mes}-${String(dia).padStart(2, "0")}`;
    if (data > hoje) return;
    lista.push({ id: novoId(), tipo, valor, data, descricao, estabelecimento: descricao, categoriaId, meio, parcela: null, recorrente: false, fimRecorrencia: null, origem: "exemplo", criado_em: criado, ...extra });
  };
  const primeiro = somarMeses(mesAtual, -3);
  // Fixos e recorrentes (lançados uma vez, repetem todo mês).
  add("receita", primeiro, 5, 7800, "Salário", "salario", "transferencia", { recorrente: true, estabelecimento: "Empresa" });
  add("despesa", primeiro, 8, 2100, "Aluguel", "moradia", "pix", { recorrente: true });
  add("despesa", primeiro, 10, 189.9, "Plano de saúde", "saude", "boleto", { recorrente: true });
  add("despesa", primeiro, 12, 129.9, "Internet e celular", "contas", "debito", { recorrente: true });
  add("despesa", primeiro, 15, 55.9, "Netflix", "assinaturas", "credito", { recorrente: true });
  add("despesa", primeiro, 15, 34.9, "Spotify", "assinaturas", "credito", { recorrente: true });
  add("despesa", primeiro, 16, 119.9, "Smart Fit", "saude", "credito", { recorrente: true });
  add("despesa", primeiro, 18, 44.9, "Globoplay", "assinaturas", "credito", { recorrente: true });
  // Variáveis por mês (valores mudam um pouco para dar realismo).
  for (let i = 0; i < 4; i++) {
    const mes = somarMeses(primeiro, i);
    const f = [1, 1.12, 0.94, 1.18][i];
    add("despesa", mes, 3, Math.round(186 * f * 100) / 100, "Energia Enel", "contas", "debito");
    add("despesa", mes, 4, Math.round(612 * f * 100) / 100, "Carrefour", "mercado", "credito");
    add("despesa", mes, 18, Math.round(398 * f * 100) / 100, "Pão de Açúcar", "mercado", "credito");
    [6, 9, 13, 17, 20, 24, 27].forEach((d, k) => add("despesa", mes, d, Math.round((42 + k * 7) * f * 100) / 100, "iFood", "delivery", "credito"));
    [7, 14, 21, 28].forEach((d, k) => add("despesa", mes, d, Math.round((68 + k * 11) * f * 100) / 100, k % 2 ? "Restaurante Coco Bambu" : "Almoço no centro", "alimentacao", "debito"));
    [2, 11, 19, 26].forEach((d) => add("despesa", mes, d, Math.round(31 * f * 100) / 100, "Uber", "transporte", "credito"));
    add("despesa", mes, 9, Math.round(240 * f * 100) / 100, "Posto Ipiranga", "transporte", "debito");
    add("despesa", mes, 22, Math.round(180 * f * 100) / 100, "Cinema e bar", "lazer", "credito");
    add("despesa", mes, 25, Math.round(310 * f * 100) / 100, i % 2 ? "Shopee" : "Amazon", "compras", "credito");
    add("despesa", mes, 14, Math.round(89 * f * 100) / 100, "Drogasil", "saude", "debito");
    add("receita", mes, 15, Math.round(210 * f * 100) / 100, "Dividendos FIIs", "passiva", "transferencia");
  }
  // Uma compra parcelada.
  const grupo = novoId();
  for (let p = 0; p < 6; p++) add("despesa", somarMeses(primeiro, 1 + p), 10, 250, "Notebook Magalu", "compras", "credito", { parcela: { atual: p + 1, total: 6, grupo } });
  return lista;
}
