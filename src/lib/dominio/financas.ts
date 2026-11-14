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

// Meta gradual de quanto guardar da renda: sobe alguns pontos por mês até o alvo.
export type RitmoGuardar = "suave" | "moderado" | "agressivo";
export type MetaGuardar = { alvoPct: number; ritmo: RitmoGuardar; inicioPct: number; inicio: string; criada_em: string };

export type FinancasDados = {
  versao: 1;
  categorias: Categoria[];
  lancamentos: Lancamento[];
  regras: Regra[];
  metas: MetaEconomia[];
  metaGuardar?: MetaGuardar | null;
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
  c("mercado", "Mercado", "despesa", "variavel", "#8FA8FF", "ShoppingCart", true),
  c("alimentacao", "Restaurantes", "despesa", "variavel", "#FF8A3D", "UtensilsCrossed"),
  c("delivery", "Delivery", "despesa", "variavel", "#FFB27A", "Bike"),
  c("transporte", "Transporte", "despesa", "variavel", "#0EA5E9", "Car"),
  c("saude", "Saúde", "despesa", "fixa", "#38BDF8", "HeartPulse", true),
  c("educacao", "Educação", "despesa", "fixa", "#6366F1", "GraduationCap", true),
  c("lazer", "Lazer", "despesa", "variavel", "#F5A524", "PartyPopper"),
  c("compras", "Compras", "despesa", "variavel", "#E8590C", "ShoppingBag"),
  c("assinaturas", "Assinaturas", "despesa", "variavel", "#A5B4FC", "Repeat"),
  c("cuidados", "Cuidados pessoais", "despesa", "variavel", "#FDBA74", "Sparkles"),
  c("dividas", "Dívidas e tarifas", "despesa", "fixa", "#4338CA", "CreditCard", true),
  c("outros", "Outros gastos", "despesa", "variavel", "#94A3B8", "CircleEllipsis"),
  c("salario", "Salário", "receita", "receita", "#2D5BFF", "Briefcase"),
  c("extra", "Renda extra", "receita", "receita", "#38BDF8", "HandCoins"),
  c("passiva", "Renda passiva", "receita", "receita", "#8FA8FF", "TrendingUp"),
  c("outras-receitas", "Outras receitas", "receita", "receita", "#94A3B8", "Plus"),
];

// Cores padrão anteriores (arco-íris), trocadas pela paleta da marca ao carregar.
export const CORES_ANTIGAS: Record<string, string> = {
  "moradia": "#2D5BFF",
  "contas": "#5B7FFF",
  "mercado": "#14B8A6",
  "alimentacao": "#F59E0B",
  "delivery": "#FF8A3D",
  "transporte": "#0EA5E9",
  "saude": "#22C55E",
  "educacao": "#8B5CF6",
  "lazer": "#EC4899",
  "compras": "#F472B6",
  "assinaturas": "#A78BFA",
  "cuidados": "#FB7185",
  "dividas": "#EF4444",
  "outros": "#94A3B8",
  "salario": "#34D399",
  "extra": "#10B981",
  "passiva": "#7C9BFF",
  "outras-receitas": "#64748B",
};

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

// --- Leitura local do texto de um comprovante (OCR feito no aparelho) ---------------------

const NUM_BR = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/gi;
const numeroBR = (t: string) => Number(t.replace(/r\$\s*/i, "").replace(/\./g, "").replace(",", "."));

// Recebe o texto extraído da foto (nota, cupom, Pix, fatura) e acha total, data,
// estabelecimento e meio de pagamento. Linhas com "total", "pagar" ou "valor" têm prioridade.
export function lerTextoComprovante(texto: string, hoje: string): Interpretacao & { confianca: number } {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  let valor: number | null = null;
  let confianca = 0.3;
  const prioridade = [/valor\s+total|total\s+a\s+pagar|valor\s+a\s+pagar|valor\s+pago|total\s+pago/, /\btotal\b|\bpagar\b/, /\bvalor\b/];
  for (const regra of prioridade) {
    for (let i = 0; i < linhas.length && valor === null; i++) {
      const l = semAcento(linhas[i]);
      if (!regra.test(l) || /subtotal|troco|desconto|tributos|imposto|lei 12/.test(l)) continue;
      const aqui = [...linhas[i].matchAll(NUM_BR)].map((m) => numeroBR(m[1]));
      const proxima = linhas[i + 1] ? [...linhas[i + 1].matchAll(NUM_BR)].map((m) => numeroBR(m[1])) : [];
      const candidatos = aqui.length ? aqui : proxima;
      if (candidatos.length) {
        valor = Math.max(...candidatos);
        confianca = regra === prioridade[0] ? 0.8 : 0.65;
      }
    }
    if (valor !== null) break;
  }
  if (valor === null) {
    const todos = linhas.filter((l) => !/troco|cnpj|cpf/i.test(l)).flatMap((l) => [...l.matchAll(NUM_BR)].map((m) => numeroBR(m[1])));
    if (todos.length) {
      valor = Math.max(...todos);
      confianca = 0.4;
    }
  }

  let data = hoje;
  for (const m of texto.matchAll(/\b(\d{2})[/.-](\d{2})[/.-](\d{2,4})\b/g)) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${ano}-${m[2]}-${m[1]}`;
    if (!Number.isNaN(Date.parse(`${iso}T12:00:00`)) && iso <= hoje && iso >= "2000-01-01") {
      data = iso;
      break;
    }
  }

  const ignorar = /cnpj|cpf|ie:|i\.e\.|inscri|cupom|nota fiscal|nfc-?e|documento auxiliar|extrato|comprovante|danfe|sat\b|rua|av\.|avenida|cep|tel|fone|www|http|^\d|data|hora|transfer|pix|pagamento|valor|banco|ag[eê]ncia/i;
  const lugar = linhas.slice(0, 8).find((l) => l.replace(/[^A-Za-zÀ-ú]/g, "").length >= 4 && !ignorar.test(l));
  const iDest = linhas.findIndex((l) => /^(para|destino|recebedor|favorecido|nome)\b/i.test(semAcento(l)));
  const restoDest = iDest >= 0 ? linhas[iDest].replace(/^(para|destino|recebedor|favorecido|nome)\s*:?\s*/i, "").trim() : "";
  const nomePix = iDest < 0 ? null : restoDest.length >= 3 ? restoDest : (linhas[iDest + 1] ?? null);
  const bruto = (nomePix && nomePix.length >= 3 ? nomePix : lugar) ?? null;
  const estabelecimento = bruto
    ? bruto
        .replace(/\b(ltda|me|eireli|s\.?a\.?|epp|comercio de|com\.?)\b\.?/gi, "")
        .replace(/[^A-Za-zÀ-ú0-9 &'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .replace(/(^|\s)\S/g, (x) => x.toUpperCase())
        .slice(0, 40)
    : null;

  const t = semAcento(texto);
  const meio: Meio | null = /\bpix\b/.test(t) ? "pix" : /credito/.test(t) ? "credito" : /debito/.test(t) ? "debito" : /dinheiro/.test(t) ? "dinheiro" : /boleto/.test(t) ? "boleto" : null;
  const parc = t.match(/\b(\d{1,2})\s*x\s*(?:de|sem juros)/);
  const tipo: TipoLancamento = /pix recebido|voce recebeu|recebimento|credito em conta/.test(t) ? "receita" : "despesa";
  return {
    tipo,
    valor: valor && valor > 0 && valor < 10_000_000 ? Math.round(valor * 100) / 100 : null,
    data,
    descricao: estabelecimento || (tipo === "receita" ? "Pix recebido" : "Compra"),
    estabelecimento,
    meio,
    parcelas: parc ? Math.min(48, Math.max(1, Number(parc[1]))) : 1,
    confianca: estabelecimento ? confianca : confianca - 0.1,
  };
}

// --- DRE pessoal (demonstrativo de resultado do mês) -------------------------------------

export type LinhaDRE = {
  id: string;
  rotulo: string;
  tipo: "grupo" | "item" | "resultado" | "destaque";
  sinal: 1 | -1;
  valores: number[]; // um por mês, sempre positivos nos grupos e itens
  categoriaId?: string;
};

// Receitas, despesas essenciais e variáveis por categoria principal, o resultado do mês
// (o "lucro" da pessoa), os aportes na carteira e o caixa que sobra depois deles.
export function dreDosMeses(dados: Pick<FinancasDados, "lancamentos" | "categorias">, meses: string[], aportes: Record<string, number>): LinhaDRE[] {
  const principal = (id: string) => {
    const c = dados.categorias.find((x) => x.id === id);
    return c?.paiId ? (dados.categorias.find((x) => x.id === c.paiId) ?? c) : c;
  };
  const somas = new Map<string, number[]>();
  for (let i = 0; i < meses.length; i++) {
    for (const o of ocorrenciasDoMes(dados.lancamentos, meses[i])) {
      const c = principal(o.categoriaId);
      const id = c?.id ?? (o.tipo === "receita" ? "outras-receitas" : "outros");
      const v = somas.get(id) ?? meses.map(() => 0);
      v[i] += o.valor;
      somas.set(id, v);
    }
  }
  const itens = (filtro: (c: Categoria | undefined, id: string) => boolean): LinhaDRE[] =>
    [...somas.entries()]
      .filter(([id]) => filtro(dados.categorias.find((x) => x.id === id), id))
      .map(([id, valores]) => ({ id: `item-${id}`, rotulo: dados.categorias.find((x) => x.id === id)?.nome ?? "Outros", tipo: "item" as const, sinal: 1 as const, valores: valores.map(arred), categoriaId: id }))
      .sort((a, b) => b.valores.reduce((s, x) => s + x, 0) - a.valores.reduce((s, x) => s + x, 0));
  const soma = (ls: LinhaDRE[]) => meses.map((_, i) => arred(ls.reduce((s, l) => s + l.valores[i], 0)));

  const receitas = itens((c, id) => (c ? c.tipo === "receita" : id === "outras-receitas"));
  const essenciais = itens((c) => Boolean(c && c.tipo === "despesa" && c.essencial));
  const variaveis = itens((c, id) => (c ? c.tipo === "despesa" && !c.essencial : id === "outros"));
  const rec = soma(receitas);
  const ess = soma(essenciais);
  const vari = soma(variaveis);
  const sobraEssencial = meses.map((_, i) => arred(rec[i] - ess[i]));
  const resultado = meses.map((_, i) => arred(sobraEssencial[i] - vari[i]));
  const aplicado = meses.map((m) => arred(aportes[m] ?? 0));
  return [
    { id: "receitas", rotulo: "Receitas", tipo: "grupo", sinal: 1, valores: rec },
    ...receitas,
    { id: "essenciais", rotulo: "(−) Despesas essenciais", tipo: "grupo", sinal: -1, valores: ess },
    ...essenciais,
    { id: "sobra-essencial", rotulo: "= Sobra após o essencial", tipo: "resultado", sinal: 1, valores: sobraEssencial },
    { id: "variaveis", rotulo: "(−) Despesas variáveis", tipo: "grupo", sinal: -1, valores: vari },
    ...variaveis,
    { id: "resultado", rotulo: "= Resultado do mês (lucro)", tipo: "destaque", sinal: 1, valores: resultado },
    { id: "aportes", rotulo: "(−) Aportes na carteira", tipo: "grupo", sinal: -1, valores: aplicado },
    { id: "caixa", rotulo: "= Caixa livre após aportes", tipo: "resultado", sinal: 1, valores: meses.map((_, i) => arred(resultado[i] - aplicado[i])) },
  ];
}

// --- Evolução: o cliente está avançando? ---------------------------------------------------

export type MesEvolucao = { mes: string; receitas: number; despesas: number; saldo: number; essenciais: number; variaveis: number; taxaPoupanca: number | null; acumulado: number; aportes: number };

export type Evolucao = {
  meses: MesEvolucao[];
  pontuacao: number; // 0 a 100
  nivel: "atencao" | "caminho" | "otimo";
  partes: { id: string; rotulo: string; pontos: number; maximo: number; dica: string }[];
  mesesPositivos: number;
  taxaMedia: number | null;
  variacaoVariaveis: number | null; // % das variáveis (3 últimos meses vs 3 anteriores)
  variacaoTaxa: number | null; // pontos percentuais da renda guardada (mês atual vs média anterior)
};

// Seis meses de receitas, despesas e sobra, com uma pontuação simples de saúde financeira:
// quanto sobra (40), peso do essencial (25), tendência dos gastos variáveis (15) e constância (20).
export function evolucaoFinanceira(dados: Pick<FinancasDados, "lancamentos" | "categorias">, mesFinal: string, aportes: Record<string, number>, quantidade = 6): Evolucao {
  let acumulado = 0;
  const meses: MesEvolucao[] = serieDeMeses(dados, mesFinal, quantidade).map((r) => {
    acumulado += r.saldo;
    return {
      mes: r.mes,
      receitas: r.receitas,
      despesas: r.despesas,
      saldo: r.saldo,
      essenciais: r.fixas,
      variaveis: r.variaveis,
      taxaPoupanca: r.receitas > 0 ? arred((r.saldo / r.receitas) * 100) : null,
      acumulado: arred(acumulado),
      aportes: arred(aportes[r.mes] ?? 0),
    };
  });
  const comDados = meses.filter((m) => m.receitas + m.despesas > 0);
  const ultimos = comDados.slice(-3);
  const anteriores = comDados.slice(-6, -3);
  const soma = (ls: MesEvolucao[], f: (m: MesEvolucao) => number) => ls.reduce((s, m) => s + f(m), 0);

  const rec3 = soma(ultimos, (m) => m.receitas);
  const taxaRecente = rec3 > 0 ? (soma(ultimos, (m) => m.saldo) / rec3) * 100 : null;
  const pesoEssencial = rec3 > 0 ? (soma(ultimos, (m) => m.essenciais) / rec3) * 100 : null;
  const var3 = soma(ultimos, (m) => m.variaveis);
  const varAntes = soma(anteriores, (m) => m.variaveis);
  const variacaoVariaveis = anteriores.length && varAntes > 0 ? ((var3 / ultimos.length - varAntes / anteriores.length) / (varAntes / anteriores.length)) * 100 : null;
  const mesesPositivos = comDados.filter((m) => m.saldo > 0).length;
  const aportou = comDados.slice(-3).filter((m) => m.aportes > 0).length;

  const ptsSobra = taxaRecente === null ? 0 : Math.round(Math.max(0, Math.min(1, taxaRecente / 20)) * 40);
  const ptsEssencial = pesoEssencial === null ? 0 : Math.round(Math.max(0, Math.min(1, (80 - pesoEssencial) / 30)) * 25);
  const ptsTendencia = variacaoVariaveis === null ? 8 : variacaoVariaveis <= -5 ? 15 : variacaoVariaveis < 5 ? 10 : variacaoVariaveis < 15 ? 5 : 0;
  const ptsConstancia = comDados.length ? Math.round((mesesPositivos / comDados.length) * 14 + (aportou / 3) * 6) : 0;
  const pontuacao = Math.min(100, ptsSobra + ptsEssencial + ptsTendencia + ptsConstancia);

  const fmt = (v: number) => `${Math.round(v)}%`;
  const partes = [
    { id: "sobra", rotulo: "Quanto sobra", pontos: ptsSobra, maximo: 40, dica: taxaRecente === null ? "Lance suas receitas para medir." : `Sobram ${fmt(taxaRecente)} das receitas; a referência é 20%.` },
    { id: "essencial", rotulo: "Peso do essencial", pontos: ptsEssencial, maximo: 25, dica: pesoEssencial === null ? "Sem receitas no período." : `O essencial leva ${fmt(pesoEssencial)} das receitas; até 50% é confortável.` },
    {
      id: "tendencia",
      rotulo: "Gastos variáveis",
      pontos: ptsTendencia,
      maximo: 15,
      dica: variacaoVariaveis === null ? "Com mais meses lançados eu mostro a tendência." : Math.abs(variacaoVariaveis) < 1 ? "Ficaram estáveis na comparação com os 3 meses anteriores." : variacaoVariaveis < 0 ? `Caíram ${fmt(-variacaoVariaveis)} na comparação com os 3 meses anteriores.` : `Subiram ${fmt(variacaoVariaveis)} na comparação com os 3 meses anteriores.`,
    },
    { id: "constancia", rotulo: "Constância", pontos: ptsConstancia, maximo: 20, dica: `${mesesPositivos} de ${comDados.length || 0} meses no azul${aportou ? `, com aporte em ${aportou} dos últimos 3` : ", sem aportes recentes"}.` },
  ];

  const taxas = comDados.map((m) => m.taxaPoupanca).filter((t): t is number => t !== null);
  const atual = comDados.at(-1)?.taxaPoupanca ?? null;
  const antes = taxas.slice(0, -1);
  return {
    meses,
    pontuacao,
    nivel: pontuacao >= 70 ? "otimo" : pontuacao >= 40 ? "caminho" : "atencao",
    partes,
    mesesPositivos,
    taxaMedia: taxas.length ? arred(taxas.reduce((s, t) => s + t, 0) / taxas.length) : null,
    variacaoVariaveis: variacaoVariaveis === null ? null : arred(variacaoVariaveis),
    variacaoTaxa: atual !== null && antes.length ? arred(atual - antes.reduce((s, t) => s + t, 0) / antes.length) : null,
  };
}

// --- Meta gradual de guardar (gamificação) -------------------------------------------------

export const PASSO_RITMO: Record<RitmoGuardar, { passo: number; rotulo: string; texto: string }> = {
  suave: { passo: 1, rotulo: "Suave", texto: "+1 ponto por mês" },
  moderado: { passo: 2, rotulo: "Moderado", texto: "+2 pontos por mês" },
  agressivo: { passo: 4, rotulo: "Agressivo", texto: "+4 pontos por mês" },
};

export type Degrau = { mes: string; alvoPct: number; guardadoPct: number | null; valorAlvo: number; guardado: number; estado: "batido" | "faltou" | "andamento" | "futuro" };

export type EscadaGuardar = {
  degraus: Degrau[];
  atual: Degrau | null;
  batidos: number;
  faltaNoMes: number;
  mesAlvo: string; // mês em que chega ao alvo
  impedimentos: { categoriaId: string; gasto: number; media: number; excesso: number }[];
};

// Quanto da renda a pessoa guarda hoje (média dos últimos 3 meses com receita).
export function rendaGuardadaAtual(dados: Pick<FinancasDados, "lancamentos" | "categorias">, mesAtual: string) {
  const meses = [1, 2, 3].map((i) => resumoDoMes(dados, somarMeses(mesAtual, -i))).filter((r) => r.receitas > 0);
  const base = meses.length ? meses : [resumoDoMes(dados, mesAtual)].filter((r) => r.receitas > 0);
  const rec = base.reduce((s, r) => s + r.receitas, 0);
  return rec > 0 ? Math.max(0, Math.round((base.reduce((s, r) => s + r.saldo, 0) / rec) * 100)) : 0;
}

export function alvoDoMes(meta: MetaGuardar, mes: string) {
  const [a1, m1] = meta.inicio.split("-").map(Number);
  const [a2, m2] = mes.split("-").map(Number);
  const indice = (a2 - a1) * 12 + (m2 - m1);
  return Math.min(meta.alvoPct, meta.inicioPct + PASSO_RITMO[meta.ritmo].passo * (indice + 1));
}

// Degraus mês a mês, do início até o alvo (no máximo 12 à frente), o mês atual e o que
// mais está pesando nas despesas variáveis em relação à média dos 3 meses anteriores.
export function escadaGuardar(dados: Pick<FinancasDados, "lancamentos" | "categorias">, meta: MetaGuardar, mesAtual: string): EscadaGuardar {
  const degraus: Degrau[] = [];
  let mes = meta.inicio;
  for (let i = 0; i < 36; i++) {
    const alvoPct = alvoDoMes(meta, mes);
    const r = resumoDoMes(dados, mes);
    const futuro = mes > mesAtual;
    const guardadoPct = !futuro && r.receitas > 0 ? Math.round((r.saldo / r.receitas) * 1000) / 10 : null;
    degraus.push({
      mes,
      alvoPct,
      guardadoPct,
      valorAlvo: arred((r.receitas * alvoPct) / 100),
      guardado: futuro ? 0 : r.saldo,
      estado: futuro ? "futuro" : mes === mesAtual ? "andamento" : guardadoPct !== null && guardadoPct >= alvoPct ? "batido" : "faltou",
    });
    if (alvoPct >= meta.alvoPct && mes >= mesAtual) break;
    mes = somarMeses(mes, 1);
  }
  const atual = degraus.find((d) => d.mes === mesAtual) ?? null;
  const mesAlvo = degraus.find((d) => d.alvoPct >= meta.alvoPct)?.mes ?? degraus.at(-1)!.mes;

  const agora = resumoDoMes(dados, mesAtual);
  const anteriores = [1, 2, 3].map((i) => resumoDoMes(dados, somarMeses(mesAtual, -i)));
  const impedimentos = agora.porCategoria
    .filter((p) => !dados.categorias.find((c) => c.id === p.categoriaId)?.essencial)
    .map((p) => {
      const media = arred(anteriores.reduce((s, r) => s + (r.porCategoria.find((x) => x.categoriaId === p.categoriaId)?.total ?? 0), 0) / anteriores.length);
      return { categoriaId: p.categoriaId, gasto: p.total, media, excesso: arred(p.total - media) };
    })
    .sort((a, b) => Math.max(0, b.excesso) - Math.max(0, a.excesso) || b.gasto - a.gasto)
    .slice(0, 4);

  return {
    degraus,
    atual,
    batidos: degraus.filter((d) => d.estado === "batido").length,
    faltaNoMes: atual ? Math.max(0, arred(atual.valorAlvo - atual.guardado)) : 0,
    mesAlvo,
    impedimentos,
  };
}
