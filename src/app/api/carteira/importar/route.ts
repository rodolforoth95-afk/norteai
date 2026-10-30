import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { lerPdf, lerPlanilha } from "@/lib/servidor/leitores";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

// Lê o arquivo e devolve uma prévia. Nada é salvo aqui: a carteira só é gravada
// quando o usuário confirma (ação confirmarImportacao). O arquivo fica só em memória.
export async function POST(req: Request) {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`importar:${uid}`, 20, 60 * 60 * 1000)) {
    return erro("Muitas importações em pouco tempo. Tente de novo mais tarde.", 429);
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return erro("Envie um arquivo.", 400);
  if (arquivo.size > TAMANHO_MAXIMO) return erro("O arquivo passa de 5 MB.", 413);

  const nome = arquivo.name.toLowerCase();
  const dados = await arquivo.arrayBuffer();

  try {
    if (nome.endsWith(".pdf")) {
      return NextResponse.json({ origem: "pdf", linhas: await lerPdf(dados) });
    }
    if (nome.endsWith(".xlsx") || nome.endsWith(".xls") || nome.endsWith(".csv")) {
      const linhas = lerPlanilha(dados, nome.endsWith(".csv"));
      const b3 = /posicao|b3|investidor/.test(nome);
      return NextResponse.json({ origem: b3 ? "b3" : "planilha", linhas });
    }
    return erro("Formato não aceito. Use PDF, XLSX ou CSV.", 415);
  } catch (e) {
    registrarErro("ler arquivo importado", e instanceof Error ? e.name : undefined);
    return erro("Não conseguimos ler esse arquivo. Confira o formato ou digite os investimentos.", 422);
  }
}
