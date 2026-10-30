import "server-only";
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";
import { classificar, extrairTicker, lerNumeroBR } from "@/lib/dominio/classificar";
import type { Classe } from "@/lib/dominio/tipos";

// Leitura de arquivos importados. Tudo acontece em memória: o arquivo nunca é
// gravado em disco, e é descartado ao fim da requisição.

export type LinhaImportada = {
  classe: Classe | null;
  codigo_ou_nome: string;
  quantidade: number | null;
  valor_atual: number | null;
};

function normalizar(t: unknown) {
  return String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Nomes de coluna variam entre versões da Área do Investidor da B3.
const COLUNAS = {
  nome: ["codigo de negociacao", "codigo", "ticker", "ativo", "produto", "titulo", "nome", "papel"],
  quantidade: ["quantidade", "qtd", "qtde", "quantidade disponivel"],
  valor: ["valor atualizado", "valor liquido", "valor bruto", "valor de mercado", "saldo", "valor atual", "valor", "total"],
  preco: ["preco de fechamento", "preco", "cotacao", "pu"],
};

function acharColuna(cabecalho: string[], opcoes: string[]) {
  for (const opcao of opcoes) {
    const i = cabecalho.findIndex((c) => c === opcao || c.startsWith(opcao));
    if (i >= 0) return i;
  }
  return -1;
}

// CSV exportado no Brasil costuma vir em Windows-1252 e com números "1.234,56".
function decodificarTexto(dados: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(dados);
  } catch {
    return new TextDecoder("windows-1252").decode(dados);
  }
}

export function lerPlanilha(dados: ArrayBuffer, csv = false): LinhaImportada[] {
  // Em CSV, raw mantém os valores como texto; lerNumeroBR converte no formato brasileiro.
  const livro = csv
    ? XLSX.read(decodificarTexto(dados), { type: "string", raw: true })
    : XLSX.read(dados, { type: "array", cellDates: false });
  const linhas: LinhaImportada[] = [];

  for (const nomeAba of livro.SheetNames) {
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets[nomeAba], { header: 1, raw: true, defval: "" });
    // O cabeçalho é a primeira linha que tem coluna de nome e de valor/quantidade.
    const iCab = matriz.findIndex((l) => {
      const cab = l.map(normalizar);
      return acharColuna(cab, COLUNAS.nome) >= 0 && (acharColuna(cab, COLUNAS.valor) >= 0 || acharColuna(cab, COLUNAS.quantidade) >= 0);
    });
    if (iCab < 0) continue;
    const cab = matriz[iCab].map(normalizar);
    const cCodigo = acharColuna(cab, ["codigo de negociacao", "codigo", "ticker"]);
    const cProduto = acharColuna(cab, ["produto", "ativo", "titulo", "nome", "papel"]);
    const cNome = cProduto >= 0 ? cProduto : acharColuna(cab, COLUNAS.nome);
    const cQtd = acharColuna(cab, COLUNAS.quantidade);
    const cValor = acharColuna(cab, COLUNAS.valor);
    const cPreco = acharColuna(cab, COLUNAS.preco);
    const dicaAba = nomeAba.toLowerCase();

    for (const l of matriz.slice(iCab + 1)) {
      // Código de negociação quando houver (ações, FIIs, ETFs); senão, o nome do produto (Tesouro, CDB…).
      const nome = String(cCodigo >= 0 ? (l[cCodigo] ?? "") : "").trim() || String(l[cNome] ?? "").trim();
      if (!nome || /^total/i.test(nome)) continue;
      const produto = String(l[cNome] ?? "");
      const quantidade = cQtd >= 0 ? lerNumeroBR(l[cQtd]) : null;
      let valor = cValor >= 0 ? lerNumeroBR(l[cValor]) : null;
      if (valor === null && quantidade !== null && cPreco >= 0) {
        const preco = lerNumeroBR(l[cPreco]);
        if (preco !== null) valor = quantidade * preco;
      }
      if (valor === null && quantidade === null) continue;
      linhas.push({
        classe: classificar(`${nome} ${produto}`, dicaAba),
        codigo_ou_nome: extrairTicker(nome) ?? nome.slice(0, 80),
        quantidade,
        valor_atual: valor,
      });
    }
  }
  return agrupar(linhas);
}

const DINHEIRO = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
const RF_LINHA = /(tesouro\s+(selic|ipca\+?|prefixado|renda\+?|educa\+?)[^\n]*?\d{4}|cdb[^\n]*|lci[^\n]*|lca[^\n]*|deb[eê]nture[^\n]*|\bcri\b[^\n]*|\bcra\b[^\n]*)/i;

// Extrato ou nota em PDF: leitura por padrões (códigos de negociação, títulos de
// renda fixa e valores em reais). O resultado sempre passa pela prévia editável.
export async function lerPdf(dados: ArrayBuffer): Promise<LinhaImportada[]> {
  const pdf = await getDocumentProxy(new Uint8Array(dados));
  const { text } = await extractText(pdf, { mergePages: true });
  const linhas: LinhaImportada[] = [];

  for (const bruta of text.split(/\n+/)) {
    const linha = bruta.replace(/\s+/g, " ").trim();
    if (linha.length < 4) continue;
    const valores = [...linha.matchAll(DINHEIRO)].map((m) => lerNumeroBR(m[1])!).filter((v) => v > 0);
    const ticker = extrairTicker(linha);
    const rf = linha.match(RF_LINHA);
    if (!ticker && !rf) continue;

    const nome = ticker ?? rf![0].replace(DINHEIRO, "").replace(/\s+/g, " ").trim().slice(0, 60);
    // Quantidade: primeiro número inteiro "solto" depois do código.
    const aposCodigo = ticker ? linha.slice(linha.toUpperCase().indexOf(ticker) + ticker.length) : "";
    const qtd = aposCodigo.match(/(?:^|\s)(\d{1,3}(?:\.\d{3})*|\d+)(?=\s|$)/);
    linhas.push({
      classe: classificar(linha),
      codigo_ou_nome: nome,
      quantidade: qtd ? lerNumeroBR(qtd[1].replace(/\./g, "")) : null,
      valor_atual: valores.length ? valores[valores.length - 1] : null,
    });
  }
  return agrupar(linhas);
}

// Junta linhas repetidas do mesmo ativo.
function agrupar(linhas: LinhaImportada[]) {
  const mapa = new Map<string, LinhaImportada>();
  for (const l of linhas) {
    const chave = l.codigo_ou_nome.toUpperCase();
    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, { ...l });
      continue;
    }
    atual.quantidade = atual.quantidade !== null || l.quantidade !== null ? (atual.quantidade ?? 0) + (l.quantidade ?? 0) : null;
    atual.valor_atual = atual.valor_atual !== null || l.valor_atual !== null ? (atual.valor_atual ?? 0) + (l.valor_atual ?? 0) : null;
    atual.classe ??= l.classe;
  }
  return [...mapa.values()].slice(0, 300);
}
