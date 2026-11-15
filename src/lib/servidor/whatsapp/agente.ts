import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { contextoFinancas } from "@/lib/dominio/assistente-financas";
import { mesDe } from "@/lib/dominio/financas";
import { MODELO_CONVERSA, clienteClaude, textoPermitido } from "../ia";
import { registrarErro } from "../util";
import { executarFerramenta, type ContextoFerramentas } from "./ferramentas";
import type { AcaoPendente, TrocaHistorico } from "./tipos";

// O Mordomo no WhatsApp: Claude com as ferramentas do Findomo. Gravar nunca é direto:
// lançar e apagar viram uma proposta que a pessoa confirma com "sim".

const MAX_VOLTAS = 5;

const SISTEMA = `Você é o Mordomo do Findomo, um app educacional de finanças pessoais e investimentos para pessoas no Brasil, conversando pelo WhatsApp. Tom: elegante, prático, próximo e sem julgamento. Português do Brasil.

## O que você faz
- Lança receitas e despesas: sempre chame propor_lancamento. O app pede a confirmação à pessoa; nunca diga que já salvou. Use a data de hoje informada para interpretar "ontem", "dia 5" etc. Escolha categoriaId da lista recebida, do mesmo tipo do lançamento; se houver regra aprendida para o estabelecimento, use-a. Se faltar o valor, pergunte.
- Se houver um lançamento aguardando confirmação e a pessoa pedir uma correção ("na verdade foi 90", "era no pix"), chame propor_lancamento de novo com todos os campos já corrigidos.
- Apaga lançamentos: chame propor_apagar (sem id = o último). Para achar outro, use ultimos_lancamentos antes.
- Responde sobre o dinheiro dela com o resumo recebido e as ferramentas resumo_do_mes, ultimos_lancamentos e plano_em_foco.
- Mercado, como na tela Mercado do app: pergunta sobre uma empresa, ação, FII ou ETF ("como estão as ações da Petrobras?") é sobre o ATIVO, não sobre a carteira da pessoa. Se ela disse o nome e não o código, chame buscar_ativo; depois detalhe_ativo (cotação, variação, P/L, dividendos, faixa de 52 semanas, setor). Bolsa no dia, Ibovespa, maiores altas e baixas: mercado_hoje. Bitcoin e outras: cripto. Taxas do Tesouro Direto: tesouro_direto. Juros e inflação: indicadores. Agenda e notícias da semana: agenda_radar.
- Carteira da pessoa: chame carteira só quando ela falar da carteira, dos investimentos ou das ações DELA ("minha carteira", "como estão meus investimentos").
- Sempre que der dados de um ativo, termine lembrando, em poucas palavras, que você não indica compra ou venda, e mande o link do ativo no app.
- Explica conceitos de investimento em linguagem simples e, quando houver, manda o link da aula do app (buscar_conteudo).

## Limites que você nunca cruza
- Você não recomenda, indica nem ranqueia ativos, fundos, corretoras ou produtos para a pessoa e não diz se ela deve comprar, vender ou manter algo. Pode dar cotação e explicar como um tipo de investimento funciona. Se pedirem indicação, diga com gentileza que o Findomo é educacional e ofereça explicar o tipo de investimento ou abrir o Simulador.
- Não promete nem estima retorno futuro.
- Não pede nem guarda CPF, senhas, números de cartão ou conta. Se a pessoa mandar, diga que não precisa.
- Use apenas números vindos das ferramentas ou do resumo; não invente valores.
- Nunca sugira cortar moradia, saúde, educação, contas da casa ou dívidas.
- Angústia com dinheiro ou dívidas: acolha com calma, sem pressionar.
- Assunto fora de finanças: responda em uma frase e volte ao que você faz.

## Formato do WhatsApp
- Respostas curtas: no máximo 6 linhas. Negrito com *asteriscos simples*. Listas com "• ". Sem títulos com #, sem tabelas, sem links em colchetes (escreva o endereço puro).
- Valores em reais no formato R$ 1.234,56. No máximo um emoji por mensagem.`;

const FERRAMENTAS_MERCADO: Anthropic.Beta.BetaTool[] = [
  {
    name: "buscar_ativo",
    description:
      "Acha o código da B3 a partir do nome de uma empresa, FII ou ETF (ex.: Petrobras → PETR4, PETR3).",
    input_schema: {
      type: "object",
      properties: { nome: { type: "string" } },
      required: ["nome"],
    },
  },
  {
    name: "detalhe_ativo",
    description:
      "Dados de até 3 ativos da B3 pelo código: preço, variação do dia, mínima e máxima, faixa de 52 semanas, P/L, P/VP, dividend yield, setor e link da página no app. Ibovespa é ^BVSP.",
    input_schema: {
      type: "object",
      properties: {
        simbolos: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["simbolos"],
    },
  },
  {
    name: "mercado_hoje",
    description:
      "A bolsa no dia: Ibovespa, maiores altas, maiores baixas e ações mais negociadas.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cripto",
    description:
      "Preço em reais e variação das 5 maiores criptomoedas (Bitcoin, Ethereum...).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "tesouro_direto",
    description: "Taxas e preços de compra dos títulos do Tesouro Direto acompanhados no app.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "agenda_radar",
    description:
      "Agenda da semana do Radar Findomo: o que o mercado espera (Copom, inflação, resultados) e os últimos fechamentos.",
    input_schema: { type: "object", properties: {} },
  },
];

const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  ...FERRAMENTAS_MERCADO,
  {
    name: "propor_lancamento",
    description:
      "Propõe um lançamento (receita ou despesa) para a pessoa confirmar. Use para qualquer gasto ou recebimento informado, e para corrigir um lançamento que está aguardando confirmação.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["despesa", "receita"] },
        valor: {
          type: "number",
          description: "Valor total em reais, positivo.",
        },
        data: { type: "string", description: "AAAA-MM-DD. Nunca no futuro." },
        descricao: {
          type: "string",
          description: "Até 60 caracteres, ex.: Almoço, Salário de novembro.",
        },
        estabelecimento: { type: ["string", "null"] },
        meio: {
          type: ["string", "null"],
          enum: [
            "pix",
            "debito",
            "credito",
            "dinheiro",
            "boleto",
            "transferencia",
            null,
          ],
        },
        parcelas: { type: "integer", description: "1 se não for parcelado." },
        categoriaId: {
          type: "string",
          description: "Um id da lista de categorias.",
        },
      },
      required: [
        "tipo",
        "valor",
        "data",
        "descricao",
        "estabelecimento",
        "meio",
        "parcelas",
        "categoriaId",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "propor_apagar",
    description:
      "Propõe apagar um lançamento, para a pessoa confirmar. Sem lancamentoId, apaga o último lançado.",
    input_schema: {
      type: "object",
      properties: { lancamentoId: { type: ["string", "null"] } },
      required: ["lancamentoId"],
      additionalProperties: false,
    },
  },
  {
    name: "resumo_do_mes",
    description:
      "Receitas, despesas, sobra e gastos por categoria de um mês, com o mês anterior para comparar.",
    input_schema: {
      type: "object",
      properties: {
        mes: {
          type: ["string", "null"],
          description: "AAAA-MM; null = mês atual.",
        },
      },
      required: ["mes"],
      additionalProperties: false,
    },
  },
  {
    name: "ultimos_lancamentos",
    description: "Os lançamentos mais recentes, com id (para apagar).",
    input_schema: {
      type: "object",
      properties: { quantidade: { type: "integer", description: "1 a 10." } },
      required: ["quantidade"],
      additionalProperties: false,
    },
  },
  {
    name: "plano_em_foco",
    description:
      "O plano em foco: meta de guardar, acumulado, aportes e limites do mês por categoria.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "carteira",
    description:
      "Resumo da carteira de investimentos DA PESSOA: patrimônio, rendimento, divisão por classe e maiores posições. Só quando ela perguntar da própria carteira; para empresas e mercado use buscar_ativo, detalhe_ativo ou mercado_hoje.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "cotacoes",
    description: "Cotação atual de ativos da B3 (até 5 códigos).",
    input_schema: {
      type: "object",
      properties: { simbolos: { type: "array", items: { type: "string" } } },
      required: ["simbolos"],
      additionalProperties: false,
    },
  },
  {
    name: "indicadores",
    description:
      "Selic, CDI, IPCA em 12 meses, poupança e a variação de 3 meses de Ibovespa, S&P 500 em reais, FIIs e bitcoin.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "buscar_conteudo",
    description:
      "Procura aulas do Findomo sobre um tema (ex.: CDB, FII, inflação) e devolve título, trecho e link.",
    input_schema: {
      type: "object",
      properties: { tema: { type: "string" } },
      required: ["tema"],
      additionalProperties: false,
    },
  },
];

export type RespostaAgente =
  | { tipo: "texto"; texto: string; bloqueado: boolean }
  | { tipo: "proposta"; acao: AcaoPendente };

function descreverPendente(p: AcaoPendente | null) {
  if (!p) return "Nenhuma ação aguardando confirmação.";
  if (p.tipo === "lancar")
    return `Aguardando confirmação: ${JSON.stringify(p.lancamento)}`;
  if (p.tipo === "apagar")
    return `Aguardando confirmação para apagar: ${p.resumo}`;
  return "Aguardando confirmação para desligar o WhatsApp.";
}

export async function conversarNoWhatsApp(params: {
  ctx: ContextoFerramentas;
  texto: string;
  historico: TrocaHistorico[];
  pendente: AcaoPendente | null;
}): Promise<RespostaAgente> {
  const { ctx } = params;
  const categorias = ctx.dados.categorias
    .map((c) => `- ${c.id} (${c.tipo}): ${c.nome}`)
    .join("\n");
  const regras =
    ctx.dados.regras
      .slice(-40)
      .map((r) => `- "${r.chave}" → ${r.categoriaId}`)
      .join("\n") || "- nenhuma";
  const contexto = [
    `Hoje é ${ctx.hoje}.`,
    `Categorias da pessoa:\n${categorias}`,
    `Regras aprendidas (estabelecimento → categoria):\n${regras}`,
    descreverPendente(params.pendente),
    `Resumo das finanças:\n${contextoFinancas(ctx.dados, mesDe(ctx.hoje), ctx.aportes)}`,
  ].join("\n\n");

  const mensagens: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of params.historico) {
    const role = t.direcao === "entrada" ? "user" : "assistant";
    const ultima = mensagens.at(-1);
    if (ultima && ultima.role === role)
      ultima.content = `${ultima.content as string}\n${t.texto.slice(0, 1500)}`;
    else mensagens.push({ role, content: t.texto.slice(0, 1500) });
  }
  if (mensagens[0]?.role === "assistant") mensagens.shift();
  if (mensagens.at(-1)?.role === "user") mensagens.pop();
  mensagens.push({ role: "user", content: params.texto.slice(0, 2000) });

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resposta = await clienteClaude().beta.messages.create({
      model: MODELO_CONVERSA,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } },
        { type: "text", text: contexto },
      ],
      tools: FERRAMENTAS,
      messages: mensagens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (resposta.stop_reason === "refusal")
      return { tipo: "texto", texto: "", bloqueado: true };

    const chamadas = resposta.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    if (resposta.stop_reason !== "tool_use" || !chamadas.length) {
      const texto = resposta.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!texto) return { tipo: "texto", texto: "", bloqueado: false };
      const permitido = await textoPermitido(texto, "chat");
      return {
        tipo: "texto",
        texto: permitido ? texto : "",
        bloqueado: !permitido,
      };
    }

    mensagens.push({ role: "assistant", content: resposta.content });
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const chamada of chamadas) {
      let r;
      try {
        r = await executarFerramenta(
          chamada.name,
          (chamada.input ?? {}) as Record<string, unknown>,
          ctx,
        );
      } catch (e) {
        registrarErro(
          `whatsapp ferramenta ${chamada.name}`,
          e instanceof Error ? e.name : undefined,
        );
        r = { tipo: "erro" as const, mensagem: "Indisponível no momento." };
      }
      if (r.tipo === "proposta") return { tipo: "proposta", acao: r.acao };
      resultados.push({
        type: "tool_result",
        tool_use_id: chamada.id,
        is_error: r.tipo === "erro",
        content: r.tipo === "erro" ? r.mensagem : JSON.stringify(r.conteudo),
      });
    }
    mensagens.push({ role: "user", content: resultados });
  }
  return { tipo: "texto", texto: "", bloqueado: false };
}
