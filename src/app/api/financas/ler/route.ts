import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarFinancas } from "@/lib/servidor/financas";
import { iaDisponivel, lerLancamentoComIA } from "@/lib/servidor/ia";
import { contextoIA, previaDaIA } from "@/lib/servidor/leitura-financas";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TIPOS = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

// Foto de nota, cupom, comprovante de Pix ou fatura → prévia do lançamento.
// O arquivo fica só em memória durante a leitura e não é guardado.
export async function POST(req: Request) {
  const { uid, repo } = await exigirUsuario();
  if (!dentroDoLimite(`fin-foto:${uid}`, 40, 60 * 60 * 1000)) return erro("Muitas fotos em pouco tempo. Tente mais tarde.", 429);
  if (!iaDisponivel()) return erro("A leitura de fotos usa a IA, que ainda não está ligada. Digite ou fale o lançamento.", 422);

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return erro("Envie uma foto.", 400);
  if (arquivo.size > TAMANHO_MAXIMO) return erro("A foto passa de 5 MB.", 413);
  if (!TIPOS.has(arquivo.type)) return erro("Use uma foto (JPG, PNG, WEBP) ou PDF.", 415);

  try {
    const dados = await carregarFinancas(repo, uid);
    const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");
    const r = await lerLancamentoComIA({ imagem: { mediaType: arquivo.type, base64, pdf: arquivo.type === "application/pdf" } }, contextoIA(dados));
    if (!r || !r.valor) return erro("Não encontramos um valor nessa foto. Tente com mais luz ou digite o lançamento.", 422);
    return NextResponse.json({ ...previaDaIA(r, dados), origem: "foto" });
  } catch (e) {
    registrarErro("foto financas", e instanceof Error ? e.name : undefined);
    return erro("Não conseguimos ler essa foto agora. Digite o lançamento.", 422);
  }
}
