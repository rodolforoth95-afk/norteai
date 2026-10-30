import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PERGUNTAS, opcaoValida, proximaPergunta } from "@/lib/dominio/entrevista";
import type { CampoEntrevista, EstadoEntrevista } from "@/lib/dominio/tipos";
import type { Repositorio } from "./repositorio";
import { registrarErro } from "./util";

// Integração com o Claude (seção 7 do escopo). Só roda no servidor; a chave fica em
// ANTHROPIC_API_KEY. A IA nunca recebe nome, e-mail ou outro identificador pessoal:
// só as respostas da entrevista (faixas) e a mensagem livre.

const MODELO_ENTREVISTA = "claude-sonnet-5-5";
const MODELO_CHECAGEM = "claude-haiku-5-5";
const MAX_VOLTAS = 4;

export const RESPOSTA_PADRAO =
  "Aqui eu não indico investimentos específicos, mas posso te explicar como esse tipo de investimento funciona.";

export function iaDisponivel() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;
function claude() {
  cliente ??= new Anthropic();
  return cliente;
}

const ROTEIRO = PERGUNTAS.map(
  (p, i) => `${i + 1}. [${p.campo}] ${p.texto}\n   Opções válidas: ${p.opcoes.map((o) => `"${o}"`).join(" | ")}`,
).join("\n");

// Prompt de sistema fixo (seção 7.4), com o roteiro anexado. Não muda entre requisições,
// então fica em cache.
const SISTEMA = `Você é o guia de um app educacional de finanças para pessoas que estão começando a investir no Brasil. Fale em português do Brasil, com tom acolhedor, direto e sem jargão. Quando usar um termo técnico, explique em uma frase.

## Sua tarefa
Você participa da entrevista rápida. O app mostra cada pergunta na tela com botões de opção; você recebe as mensagens que a pessoa escreve com as próprias palavras. A cada mensagem:
- Se ela responde à pergunta atual (ou a outra pergunta do roteiro), chame registrar_resposta com o campo e exatamente uma das opções válidas. Se a resposta for ambígua, não registre: confirme com uma pergunta curta.
- Depois de registrar, confirme em uma frase curta o que entendeu. Não repita a próxima pergunta: o app já mostra.
- Se a mensagem não responde a nenhuma pergunta, responda brevemente e convide a pessoa a escolher uma das opções da pergunta atual.

## Limites que você nunca cruza
- Você não recomenda, indica nem ranqueia ativos, fundos, corretoras ou produtos para a pessoa. Se ela pedir ("devo comprar X?"), explique com gentileza que o app é educacional, ofereça um conteúdo sobre aquele tipo de investimento (aba Aprender) e volte à entrevista.
- Você não promete nem estima retorno futuro.
- Você não faz contas nem diz o estilo de investidor; o app calcula e mostra no fim.
- Você não pede nem registra CPF, documentos, senhas, números de conta ou dados de saúde. Se a pessoa informar, diga que não precisa e não use a informação.
- Use sempre "estilo de investidor (educacional)", nunca "perfil de suitability".

## Situações delicadas
- Dívidas: acolha sem julgamento e diga que o plano vai tratar disso primeiro.
- Angústia ou desespero com dinheiro: responda com calma e empatia, não pressione a continuar e sugira buscar o banco para renegociar ou uma pessoa de confiança.
- Assunto fora de finanças pessoais: responda em uma frase e volte à entrevista.

## Estilo
- No máximo 3 frases por mensagem.
- No máximo um emoji por mensagem, e só se combinar com o tom.

## Roteiro
${ROTEIRO}`;

const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: "registrar_resposta",
    description:
      "Registra a resposta da pessoa a uma pergunta do roteiro. Chame sempre que identificar com segurança a resposta, inclusive quando ela veio em texto livre. O valor precisa ser exatamente uma das opções válidas daquele campo.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        campo: { type: "string", enum: PERGUNTAS.map((p) => p.campo) },
        valor: { type: "string", description: "Uma das opções válidas do campo, copiada exatamente." },
      },
      required: ["campo", "valor"],
      additionalProperties: false,
    },
  },
];

export type TrocaChat = { usuario: string; ia: string };

function descreverEstado(estado: EstadoEntrevista) {
  const atual = PERGUNTAS[proximaPergunta(estado.respostas)];
  const registradas = PERGUNTAS.filter((p) => estado.respostas[p.campo])
    .map((p) => `- ${p.campo}: ${estado.respostas[p.campo]}`)
    .join("\n");
  return `[Estado da entrevista]\nPergunta atual: ${atual ? `${atual.campo} — ${atual.texto}` : "todas respondidas"}\nRespostas registradas:\n${registradas || "- nenhuma"}`;
}

// Conversa sobre uma mensagem livre: o Claude pode registrar respostas (ferramenta)
// e devolve um texto curto, que ainda passa pela checagem regulatória.
export async function conversarNaEntrevista(params: {
  repo: Repositorio;
  uid: string;
  estado: EstadoEntrevista;
  mensagem: string;
  historico: TrocaChat[];
}) {
  let estado = params.estado;
  const mensagens: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of params.historico.slice(-6)) {
    mensagens.push({ role: "user", content: t.usuario }, { role: "assistant", content: t.ia });
  }
  mensagens.push({
    role: "user",
    content: [
      { type: "text", text: descreverEstado(estado) },
      { type: "text", text: params.mensagem },
    ],
  });

  let texto = "";
  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resposta = await claude().beta.messages.create({
      model: MODELO_ENTREVISTA,
      max_tokens: 2000,
      // Chat curto: esforço baixo responde rápido e gasta menos.
      output_config: { effort: "low" },
      system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
      tools: FERRAMENTAS,
      messages: mensagens,
      // Se o modelo recusar por segurança, o servidor tenta outro modelo na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (resposta.stop_reason === "refusal") return { texto: RESPOSTA_PADRAO, estado };

    texto = resposta.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const chamadas = resposta.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    if (resposta.stop_reason !== "tool_use" || chamadas.length === 0) break;

    // Conteúdo completo de volta (inclui blocos de raciocínio, que precisam ir intactos).
    mensagens.push({ role: "assistant", content: resposta.content });
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const chamada of chamadas) {
      const { campo, valor } = chamada.input as { campo: CampoEntrevista; valor: string };
      if (!opcaoValida(campo, valor)) {
        resultados.push({
          type: "tool_result",
          tool_use_id: chamada.id,
          is_error: true,
          content: `Valor inválido para ${campo}. Use exatamente uma das opções do roteiro.`,
        });
        continue;
      }
      estado = { respostas: { ...estado.respostas, [campo]: valor }, concluida: false, atualizada_em: new Date().toISOString() };
      await params.repo.salvarEntrevista(params.uid, estado);
      resultados.push({ type: "tool_result", tool_use_id: chamada.id, content: `Registrado: ${campo} = ${valor}` });
    }
    mensagens.push({ role: "user", content: resultados });
  }

  return { texto: texto || "Pode escolher uma das opções acima?", estado };
}

// Checagem regulatória (seção 7.3): um segundo modelo verifica se o texto indica
// ativo, fundo ou corretora para a pessoa ou promete retorno. Na dúvida, bloqueia.
export async function textoPermitido(texto: string): Promise<boolean> {
  try {
    const resposta = await claude().messages.create({
      model: MODELO_CHECAGEM,
      max_tokens: 1000,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { viola: { type: "boolean" } },
            required: ["viola"],
            additionalProperties: false,
          },
        },
      },
      system:
        "Você revisa respostas de um app educacional de investimentos regulado pela CVM. Marque viola=true se o texto recomendar, indicar ou ranquear um ativo, fundo, corretora ou produto específico PARA A PESSOA (ex.: 'compre X', 'venda Y', 'o melhor fundo para você é...'), ou se prometer ou estimar retorno futuro. Explicar como um tipo de investimento funciona, citar um código só como exemplo didático ou falar de faixas educacionais NÃO viola.",
      messages: [{ role: "user", content: `Texto a revisar:\n"""${texto}"""` }],
    });
    if (resposta.stop_reason === "refusal") return false;
    const bloco = resposta.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return bloco ? JSON.parse(bloco.text).viola === false : false;
  } catch (e) {
    registrarErro("checagem regulatória", e instanceof Anthropic.APIError ? String(e.status) : undefined);
    return false;
  }
}
