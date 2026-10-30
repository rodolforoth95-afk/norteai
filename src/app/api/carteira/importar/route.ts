import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { dataDoTexto, lerPdf, lerPlanilha, type LinhaImportada } from "@/lib/servidor/leitores";
import { iaDisponivel, lerExtratoComIA } from "@/lib/servidor/ia";
import { classificar, extrairTicker } from "@/lib/dominio/classificar";
import { dataValida } from "@/lib/dominio/carteira";
import type { Classe } from "@/lib/dominio/tipos";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const IMAGENS: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const CLASSES = new Set(["renda_fixa", "acoes_etfs", "fiis", "multimercado", "cripto", "exterior"]);

type Lido = { origem: "pdf" | "planilha" | "imagem"; linhas: LinhaImportada[]; data: string | null; viaIA: boolean };

// Lê o arquivo e devolve uma prévia com a data sugerida. Nada é salvo aqui: a pessoa
// confere, ajusta e confirma na tela. O arquivo fica só em memória.
export async function POST(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`importar:${uid}`, 20, 60 * 60 * 1000)) {
    return erro("Muitas importações em pouco tempo. Tente de novo mais tarde.", 429);
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return erro("Envie um arquivo.", 400);
  if (arquivo.size > TAMANHO_MAXIMO) return erro("O arquivo passa de 5 MB.", 413);

  const extensao = arquivo.name.toLowerCase().split(".").pop() ?? "";
  const dados = await arquivo.arrayBuffer();

  try {
    let lido: Lido;
    if (extensao === "pdf") {
      const { linhas, data } = await lerPdf(dados);
      lido = { origem: "pdf", linhas, data, viaIA: false };
      // PDF escaneado (sem texto): tenta a leitura pela IA.
      if (!linhas.length && iaDisponivel()) lido = { ...(await viaIA("pdf", "application/pdf", dados)), origem: "pdf" };
    } else if (["xlsx", "xls", "csv"].includes(extensao)) {
      lido = { origem: "planilha", linhas: lerPlanilha(dados, extensao === "csv"), data: dataDoTexto(arquivo.name.replace(/[-_]/g, "/")), viaIA: false };
    } else if (IMAGENS[extensao]) {
      if (!iaDisponivel()) {
        return erro("A leitura de imagens usa a IA, que ainda não está ligada. Envie o PDF ou a planilha, ou digite os investimentos.", 422);
      }
      lido = await viaIA("imagem", IMAGENS[extensao], dados);
    } else {
      return erro("Formato não aceito. Use PDF, planilha (XLSX ou CSV) ou imagem (PNG, JPG).", 415);
    }
    return NextResponse.json(lido);
  } catch (e) {
    registrarErro("ler arquivo importado", e instanceof Error ? e.name : undefined);
    return erro("Não conseguimos ler esse arquivo. Confira o formato ou digite os investimentos.", 422);
  }
}

async function viaIA(tipo: "imagem" | "pdf", mediaType: string, dados: ArrayBuffer): Promise<Lido> {
  const r = await lerExtratoComIA({ tipo, mediaType, base64: Buffer.from(dados).toString("base64") });
  const linhas: LinhaImportada[] = (r?.itens ?? [])
    .filter((i) => i.nome?.trim() && (i.valor !== null || i.quantidade !== null))
    .slice(0, 300)
    .map((i) => {
      const nome = i.nome.trim().slice(0, 80);
      const classe = CLASSES.has(i.classe) ? (i.classe as Classe) : classificar(nome);
      return { classe, codigo_ou_nome: extrairTicker(nome) ?? nome, quantidade: i.quantidade, valor_atual: i.valor };
    });
  const data = r?.data_referencia && dataValida(r.data_referencia) ? r.data_referencia : null;
  return { origem: "imagem", linhas, data, viaIA: true };
}
