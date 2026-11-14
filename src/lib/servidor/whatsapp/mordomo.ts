import { responderLocal } from "@/lib/dominio/assistente-financas";
import { hojeBR } from "@/lib/dominio/carteira";
import { extrairTicker } from "@/lib/dominio/classificar";
import {
  interpretarFrase,
  mesDe,
  normalizar,
  sugerirCategoria,
  resumoDoMes,
  somarMeses,
  type FinancasDados,
} from "@/lib/dominio/financas";
import type { ArmazemWhatsApp } from "./armazem/tipo";
import { lerComando, lerCorrecao } from "./comandos";
import type { RespostaAgente } from "./agente";
import type { ContextoFerramentas } from "./ferramentas";
import {
  CODIGO_INVALIDO,
  ERRO_GERAL,
  MENU,
  MUITAS_MENSAGENS,
  SEM_AUDIO,
  SEM_IA_MIDIA,
  boasVindas,
  brl,
  lancamentoSalvo,
  naoVinculado,
  propostaLancamento,
  resumoDoMesTexto,
  resumoLancamento,
  site,
  ultimosTexto,
} from "./textos";
import type {
  AcaoPendente,
  LancamentoProposto,
  MensagemCanal,
  MidiaCanal,
  TrocaHistorico,
  Vinculo,
} from "./tipos";

// Atendimento de uma mensagem do WhatsApp, do vínculo à resposta. Tudo o que fala com
// o mundo (banco, IA, cotações) entra por "Dependencias", para os testes trocarem.

export type Financas = {
  carregar(uid: string): Promise<FinancasDados>;
  gravar(uid: string, dados: FinancasDados): Promise<void>;
  aportes(uid: string): Promise<Record<string, number>>;
  // Grava o lançamento com as mesmas regras do site. Lança erro com mensagem legível.
  lancar(dados: FinancasDados, l: LancamentoProposto, hoje: string): void;
};

export type Dependencias = {
  armazem: ArmazemWhatsApp;
  financas: Financas;
  agora: () => Date;
  primeiroNome: (uid: string) => Promise<string>;
  limite: (chave: string) => boolean;
  ia: {
    disponivel: boolean;
    conversar: (p: {
      ctx: Omit<ContextoFerramentas, "repo">;
      texto: string;
      historico: TrocaHistorico[];
      pendente: AcaoPendente | null;
    }) => Promise<RespostaAgente>;
    lerImagem: (
      midia: MidiaCanal,
      dados: FinancasDados,
    ) => Promise<LancamentoProposto | null>;
  };
  transcrever: (midia: MidiaCanal) => Promise<string | null>;
  cotacao: (
    simbolo: string,
  ) => Promise<{ preco: number; variacaoPct: number; nome: string } | null>;
  auditarBloqueio: (uid: string) => Promise<void>;
};

export const RESPOSTA_REGULATORIA =
  "Aqui eu não indico investimentos específicos, mas posso te explicar como esse tipo de investimento funciona.";

const VALIDADE_PENDENTE_MS = 10 * 60 * 1000;
const HISTORICO_MS = 3 * 60 * 60 * 1000;
const TRAVADA_MS = 2 * 60 * 1000;

export type Resultado = {
  respostas: string[];
  repetida: boolean;
  usuarioId: string | null;
};

export async function processarMensagem(
  m: MensagemCanal,
  deps: Dependencias,
): Promise<Resultado> {
  const agora = deps.agora();
  const vinculo =
    (m.lid ? await deps.armazem.vinculoPorLid(m.lid) : null) ??
    (await deps.armazem.vinculoPorTelefone(m.telefone));
  const entrada = await deps.armazem.registrarEntrada({
    messageId: m.messageId,
    usuarioId: vinculo?.usuarioId ?? null,
    telefone: m.telefone,
    tipo: m.midia?.tipo ?? "texto",
    texto: m.texto,
  });

  if (!entrada.novo) {
    if (entrada.status === "respondida")
      return {
        respostas: await deps.armazem.respostasDe(entrada.id),
        repetida: true,
        usuarioId: vinculo?.usuarioId ?? null,
      };
    const travada = agora.getTime() - Date.parse(entrada.criadoEm) > TRAVADA_MS;
    if (entrada.status === "processando" && !travada)
      return {
        respostas: [],
        repetida: true,
        usuarioId: vinculo?.usuarioId ?? null,
      };
    await deps.armazem.atualizarEntrada(entrada.id, { status: "processando" });
  }

  let respostas: string[];
  let usuarioId = vinculo?.usuarioId ?? null;
  let textoGuardado: string | undefined;
  try {
    if (!deps.limite(`wa:${m.telefone}`)) respostas = [MUITAS_MENSAGENS];
    else {
      const r = await responder(m, vinculo, deps);
      respostas = r.respostas;
      usuarioId = r.usuarioId;
      textoGuardado = r.textoEntrada;
    }
    await deps.armazem.atualizarEntrada(entrada.id, {
      status: "respondida",
      usuarioId,
      ...(textoGuardado !== undefined ? { texto: textoGuardado } : {}),
    });
  } catch (e) {
    console.error(
      "[norteia] whatsapp atender",
      e instanceof Error ? e.message.slice(0, 120) : "",
    );
    respostas = [ERRO_GERAL];
    await deps.armazem.atualizarEntrada(entrada.id, { status: "erro" });
  }
  respostas = respostas.filter((t) => t.trim());
  await deps.armazem.registrarSaidas({
    usuarioId,
    telefone: m.telefone,
    textos: respostas,
    respostaDe: entrada.id,
  });
  return { respostas, repetida: false, usuarioId };
}

type Resposta = {
  respostas: string[];
  usuarioId: string | null;
  textoEntrada?: string;
};

async function responder(
  m: MensagemCanal,
  vinculo: Vinculo | null,
  deps: Dependencias,
): Promise<Resposta> {
  const agora = deps.agora();
  const iso = agora.toISOString();
  const comando = m.midia ? { tipo: "texto" as const } : lerComando(m.texto);

  if (comando.tipo === "codigo") {
    const dono = await deps.armazem.consumirCodigo(comando.codigo, iso);
    if (!dono)
      return {
        respostas: [CODIGO_INVALIDO],
        usuarioId: vinculo?.usuarioId ?? null,
      };
    if (vinculo?.usuarioId === dono)
      return {
        respostas: [
          "Este WhatsApp já está ligado à sua conta. Mande *ajuda* para ver o que eu faço.",
        ],
        usuarioId: dono,
      };
    await deps.armazem.vincular({
      usuarioId: dono,
      telefone: m.telefone,
      lid: m.lid,
      jid: m.jid,
      nomeWhatsapp: m.nome.slice(0, 60) || null,
      avisos: true,
      consentidoEm: iso,
    });
    return {
      respostas: boasVindas(await deps.primeiroNome(dono)),
      usuarioId: dono,
    };
  }

  if (!vinculo) return { respostas: [naoVinculado()], usuarioId: null };
  const uid = vinculo.usuarioId;
  const hoje = hojeBR(agora);
  const pendente = await deps.armazem.obterPendente(uid, iso);
  const dados = await deps.financas.carregar(uid);
  const propor = async (
    acao: AcaoPendente,
    texto: string,
    prefixo?: string,
  ): Promise<Resposta> => {
    await deps.armazem.salvarPendente(
      uid,
      acao,
      new Date(agora.getTime() + VALIDADE_PENDENTE_MS).toISOString(),
    );
    return {
      respostas: [prefixo ? `${prefixo}\n\n${texto}` : texto],
      usuarioId: uid,
    };
  };
  const proporLancamento = (l: LancamentoProposto, prefixo?: string) =>
    propor(
      { tipo: "lancar", lancamento: l },
      propostaLancamento(l, dados.categorias, hoje),
      prefixo,
    );
  const proporApagar = (acao: AcaoPendente & { tipo: "apagar" }) =>
    propor(acao, `Apago a ${acao.resumo}? Responda *sim* ou *não*.`);

  switch (comando.tipo) {
    case "sim":
      if (!pendente)
        return {
          respostas: [
            "Não tenho nada aguardando confirmação. Me mande um lançamento ou uma pergunta.",
          ],
          usuarioId: uid,
        };
      return {
        respostas: [await executar(pendente, uid, dados, hoje, deps)],
        usuarioId: uid,
      };
    case "nao":
      if (!pendente)
        return {
          respostas: ["Tudo bem. Estou por aqui quando precisar."],
          usuarioId: uid,
        };
      await deps.armazem.limparPendente(uid);
      return {
        respostas: ["Tudo bem, descartei. Nada foi alterado."],
        usuarioId: uid,
      };
    case "corrigir":
      return {
        respostas: [
          pendente?.tipo === "lancar"
            ? 'Me diga o que corrigir, por exemplo: "valor 90", "foi ontem", "no pix" ou "categoria mercado".'
            : "Não tenho lançamento aguardando. Para apagar o último, mande *apagar o último*.",
        ],
        usuarioId: uid,
      };
    case "ajuda":
      return { respostas: [MENU], usuarioId: uid };
    case "sair":
      return propor(
        { tipo: "desvincular" },
        "Quer desligar este WhatsApp da sua conta Findomo? Seus dados continuam no app. Responda *sim* para desligar.",
      );
    case "apagar_ultimo": {
      const ultimo = [...dados.lancamentos]
        .filter((l) => l.origem !== "exemplo")
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
      if (!ultimo)
        return {
          respostas: ["Você ainda não tem lançamentos para apagar."],
          usuarioId: uid,
        };
      return proporApagar({
        tipo: "apagar",
        lancamentoId: ultimo.id,
        resumo: resumoLancamento(ultimo),
      });
    }
    case "resumo": {
      const mes = mesDe(hoje);
      return {
        respostas: [
          resumoDoMesTexto(
            resumoDoMes(dados, mes),
            resumoDoMes(dados, somarMeses(mes, -1)),
            dados.categorias,
          ),
        ],
        usuarioId: uid,
      };
    }
    case "ultimos": {
      const lista = [...dados.lancamentos]
        .filter((l) => l.data <= hoje)
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) ||
            b.criado_em.localeCompare(a.criado_em),
        )
        .slice(0, 6);
      return {
        respostas: [ultimosTexto(lista, dados.categorias)],
        usuarioId: uid,
      };
    }
  }

  let texto = m.texto.trim();
  let prefixo: string | undefined;
  let textoEntrada: string | undefined;
  if (m.midia?.tipo === "audio") {
    const transcrito = await deps.transcrever(m.midia);
    if (!transcrito) return { respostas: [SEM_AUDIO], usuarioId: uid };
    texto = transcrito;
    textoEntrada = `[áudio] ${transcrito}`;
    prefixo = `🎤 Ouvi: "${transcrito.slice(0, 200)}"`;
  } else if (m.midia) {
    if (!deps.ia.disponivel)
      return { respostas: [SEM_IA_MIDIA], usuarioId: uid };
    const lido = await deps.ia.lerImagem(m.midia, dados);
    if (!lido)
      return {
        respostas: [
          "Não consegui achar um valor nessa imagem. Pode me mandar uma foto mais nítida ou escrever o lançamento?",
        ],
        usuarioId: uid,
      };
    const r = await proporLancamento(lido);
    return { ...r, textoEntrada: m.texto || "[imagem]" };
  }
  if (!texto) return { respostas: [MENU], usuarioId: uid };

  if (pendente?.tipo === "lancar" && texto.length <= 60) {
    const corrigido = aplicarCorrecao(pendente.lancamento, texto, dados, hoje);
    if (corrigido)
      return { ...(await proporLancamento(corrigido, prefixo)), textoEntrada };
  }

  if (deps.ia.disponivel) {
    const aportes = await deps.financas.aportes(uid);
    const historico = await deps.armazem.historico(
      uid,
      new Date(agora.getTime() - HISTORICO_MS).toISOString(),
      12,
    );
    const r = await deps.ia.conversar({
      ctx: { uid, dados, hoje, aportes },
      texto,
      historico,
      pendente,
    });
    if (r.tipo === "proposta") {
      if (r.acao.tipo === "lancar")
        return {
          ...(await proporLancamento(r.acao.lancamento, prefixo)),
          textoEntrada,
        };
      if (r.acao.tipo === "apagar")
        return { ...(await proporApagar(r.acao)), textoEntrada };
    } else if (r.bloqueado) {
      await deps.auditarBloqueio(uid);
      return {
        respostas: [RESPOSTA_REGULATORIA],
        usuarioId: uid,
        textoEntrada,
      };
    } else if (r.texto) {
      return {
        respostas: [prefixo ? `${prefixo}\n\n${r.texto}` : r.texto],
        usuarioId: uid,
        textoEntrada,
      };
    }
  }

  const local = await responderSemIA(texto, dados, hoje, uid, deps);
  if (local.tipo === "proposta")
    return {
      ...(await proporLancamento(local.lancamento, prefixo)),
      textoEntrada,
    };
  return {
    respostas: [prefixo ? `${prefixo}\n\n${local.texto}` : local.texto],
    usuarioId: uid,
    textoEntrada,
  };
}

function diasAtras(hoje: string, n: number) {
  const d = new Date(`${hoje}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function aplicarCorrecao(
  l: LancamentoProposto,
  texto: string,
  dados: FinancasDados,
  hoje: string,
): LancamentoProposto | null {
  const c = lerCorrecao(texto);
  const t = normalizar(texto);
  const categoria = /categoria|e de |era de |foi de /.test(t)
    ? dados.categorias.find(
        (x) => x.tipo === (c?.tipo ?? l.tipo) && t.includes(normalizar(x.nome)),
      )
    : undefined;
  if (!c && !categoria) return null;
  const novo = { ...l };
  if (c?.valor && c.valor > 0) novo.valor = Math.round(c.valor * 100) / 100;
  if (c?.data)
    novo.data =
      c.data === "hoje" ? hoje : diasAtras(hoje, c.data === "ontem" ? 1 : 2);
  if (c?.meio) novo.meio = c.meio;
  if (c?.tipo && c.tipo !== l.tipo) {
    novo.tipo = c.tipo;
    const mesma = dados.categorias.find(
      (x) => x.id === l.categoriaId && x.tipo === c.tipo,
    );
    if (!mesma)
      novo.categoriaId =
        dados.categorias.find((x) => x.tipo === c.tipo)?.id ?? l.categoriaId;
  }
  if (categoria) novo.categoriaId = categoria.id;
  return novo;
}

async function executar(
  pendente: AcaoPendente,
  uid: string,
  dados: FinancasDados,
  hoje: string,
  deps: Dependencias,
): Promise<string> {
  if (pendente.tipo === "desvincular") {
    await deps.armazem.desvincular(uid);
    return `Pronto, desliguei este WhatsApp da sua conta. Para voltar, gere um novo código em ${site()}/conta/whatsapp.`;
  }
  if (pendente.tipo === "apagar") {
    const antes = dados.lancamentos.length;
    dados.lancamentos = dados.lancamentos.filter(
      (l) => l.id !== pendente.lancamentoId,
    );
    await deps.armazem.limparPendente(uid);
    if (dados.lancamentos.length === antes)
      return "Esse lançamento já não existe.";
    await deps.financas.gravar(uid, dados);
    return `Apaguei a ${pendente.resumo}. ✅`;
  }
  try {
    deps.financas.lancar(dados, pendente.lancamento, hoje);
  } catch (e) {
    await deps.armazem.limparPendente(uid);
    return `Não consegui lançar: ${e instanceof Error ? e.message : "dados inválidos"} Me mande de novo, por favor.`;
  }
  await deps.financas.gravar(uid, dados);
  await deps.armazem.limparPendente(uid);
  return lancamentoSalvo(
    pendente.lancamento,
    resumoDoMes(dados, mesDe(pendente.lancamento.data)),
    dados.categorias,
  );
}

async function responderSemIA(
  texto: string,
  dados: FinancasDados,
  hoje: string,
  uid: string,
  deps: Dependencias,
): Promise<
  | { tipo: "proposta"; lancamento: LancamentoProposto }
  | { tipo: "texto"; texto: string }
> {
  const ticker = extrairTicker(texto.toUpperCase());
  const pareceLancamento =
    /\b(gastei|paguei|recebi|comprei|vendi|ganhei|transferi|r\$|reais)\b/i.test(
      texto,
    );
  if (ticker && !pareceLancamento) {
    const c = await deps.cotacao(ticker).catch(() => null);
    return {
      tipo: "texto",
      texto: c
        ? `*${ticker}* (${c.nome}) está em ${brl(c.preco)}, ${c.variacaoPct >= 0 ? "alta" : "queda"} de ${Math.abs(c.variacaoPct).toFixed(2).replace(".", ",")}% hoje. Eu não indico compra ou venda; para estudar o ativo, veja ${site()}/mercado/${ticker}.`
        : `Não consegui a cotação de ${ticker} agora. Veja em ${site()}/mercado/${ticker}.`,
    };
  }
  const frase = ticker ? texto.replace(new RegExp(ticker, "gi"), " ") : texto;
  const p = interpretarFrase(frase, hoje);
  const categoria = sugerirCategoria(
    `${p.estabelecimento ?? ""} ${p.descricao} ${frase}`,
    p.tipo,
    dados,
  );
  if (p.valor && p.valor > 0) {
    return {
      tipo: "proposta",
      lancamento: {
        tipo: p.tipo,
        valor: p.valor,
        data: p.data,
        descricao: p.descricao || "Lançamento",
        estabelecimento: p.estabelecimento,
        meio: p.meio,
        parcelas: p.parcelas,
        categoriaId: categoria.categoriaId,
      },
    };
  }
  const aportes = await deps.financas.aportes(uid);
  const resposta = responderLocal(texto, dados, mesDe(hoje), aportes);
  return {
    tipo: "texto",
    texto: resposta.replace(
      "Use o botão + para lançar",
      "Me mande seus lançamentos aqui ou use o botão + no app para lançar",
    ),
  };
}
