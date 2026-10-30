import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verificarTextoLivre } from "@/lib/dominio/entrevista";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { RESPOSTA_PADRAO, conversarNaEntrevista, iaDisponivel, textoPermitido } from "@/lib/servidor/ia";
import { dentroDoLimite, erro, registrarErro } from "@/lib/servidor/util";

const Corpo = z.object({
  mensagem: z.string().trim().min(1).max(500),
  historico: z
    .array(z.object({ usuario: z.string().max(500), ia: z.string().max(1500) }))
    .max(6)
    .default([]),
});

// Mensagem livre na entrevista (seção 7.1). A resposta só é exibida depois da
// checagem regulatória, por isso não usamos streaming aqui.
export async function POST(req: Request) {
  if (!iaDisponivel()) return erro("IA indisponível.", 503, { semIA: true });

  const { uid, repo } = await exigirUsuario();
  if (!dentroDoLimite(`ia:${uid}`, 60, 24 * 60 * 60 * 1000)) {
    return erro("Você atingiu o limite de 60 mensagens por dia. Use os botões de resposta.", 429, { semIA: true });
  }

  const lido = Corpo.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Mensagem inválida.", 400);
  const { mensagem, historico } = lido.data;

  // Dado sensível nunca é enviado à IA (LGPD).
  if (verificarTextoLivre(mensagem) === "dado_sensivel") {
    return erro("Dado sensível.", 422, { dadoSensivel: true });
  }

  const estado = (await repo.obterEntrevista(uid)) ?? { respostas: {}, concluida: false, atualizada_em: "" };

  try {
    const resultado = await conversarNaEntrevista({ repo, uid, estado, mensagem, historico });
    let resposta = resultado.texto;
    if (!(await textoPermitido(resposta))) {
      resposta = RESPOSTA_PADRAO;
      await repo.registrarAuditoriaIA(uid, "bloqueio_regulatorio");
    }
    return NextResponse.json({ resposta, estado: resultado.estado });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      registrarErro("IA da entrevista", "429");
      return erro("O guia está ocupado agora.", 503, { semIA: true });
    }
    registrarErro("IA da entrevista", e instanceof Anthropic.APIError ? String(e.status) : undefined);
    return erro("O guia não respondeu agora.", 502, { semIA: true });
  }
}
