"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { PERGUNTAS, TOTAL_PERGUNTAS, opcaoValida, proximaPergunta } from "@/lib/dominio/entrevista";
import { calcularEstilo } from "@/lib/dominio/motor";
import { RECOMPENSAS, resumoMoedas } from "@/lib/dominio/moedas";
import type { CampoEntrevista, EstadoEntrevista, Posicao, Respostas } from "@/lib/dominio/tipos";
import { VIDEOS } from "@/lib/conteudo/videos";
import { AULAS } from "@/lib/conteudo/aulas";
import { moduloPorSlug } from "@/lib/conteudo/modulos";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { registrarCarteira } from "@/lib/servidor/carteira";
import { substituirSnapshotsTeste } from "@/lib/servidor/repositorio/arquivo";
import { carteiraExemplo } from "@/lib/servidor/exemplo";
import { TAG_MERCADO, brapiDisponivel, cotacoes, tagAtivo } from "@/lib/servidor/brapi";
import { dentroDoLimite, registrarErro } from "@/lib/servidor/util";
import { CARTEIRAS, LIMITES, comentarioPadrao, resumoParaIA, simular } from "@/lib/dominio/simulador";
import { indicadores } from "@/lib/servidor/indicadores";
import { comentarSimulacao, iaDisponivel } from "@/lib/servidor/ia";
import { extrairTicker } from "@/lib/dominio/classificar";

// --- Entrevista ---------------------------------------------------------------

export async function responderPergunta(campo: CampoEntrevista, valor: string) {
  const { uid, repo } = await exigirUsuario();
  if (!PERGUNTAS.some((p) => p.campo === campo) || !opcaoValida(campo, valor)) {
    return { erro: "Resposta inválida." };
  }
  const atual = (await repo.obterEntrevista(uid)) ?? { respostas: {}, concluida: false, atualizada_em: "" };
  const estado: EstadoEntrevista = {
    respostas: { ...atual.respostas, [campo]: valor },
    concluida: false,
    atualizada_em: new Date().toISOString(),
  };
  await repo.salvarEntrevista(uid, estado);
  return { estado };
}

export async function concluirEntrevista() {
  const { uid, repo } = await exigirUsuario();
  const entrevista = await repo.obterEntrevista(uid);
  if (!entrevista || proximaPergunta(entrevista.respostas) < TOTAL_PERGUNTAS) {
    return { erro: "Ainda faltam respostas." };
  }
  const respostas = entrevista.respostas as Required<Respostas>;
  const resultado = calcularEstilo(respostas);
  const perfil = await repo.salvarPerfil(uid, {
    respostas,
    pontuacao: resultado.pontuacao,
    estilo: resultado.estilo,
    travado: resultado.travado,
  });
  await repo.salvarEntrevista(uid, { ...entrevista, concluida: true, atualizada_em: new Date().toISOString() });
  const ganhou = await repo.lancarMoedas(uid, "entrevista", "primeira", RECOMPENSAS.entrevista.valor);
  // Sem revalidatePath aqui: recarregar /entrevista agora redirecionaria para /inicio
  // antes de mostrar o encerramento. As páginas do app são dinâmicas e leem os dados novos.
  return { perfil, moedas: ganhou ? RECOMPENSAS.entrevista.valor : 0 };
}

export async function reiniciarEntrevista() {
  const { uid, repo } = await exigirUsuario();
  await repo.salvarEntrevista(uid, { respostas: {}, concluida: false, atualizada_em: new Date().toISOString() });
}

// --- Vídeos, conteúdos e coins --------------------------------------------------

export async function concluirVideo(slug: string) {
  const { uid, repo } = await exigirUsuario();
  if (!VIDEOS.some((v) => v.slug === slug)) return { moedas: 0 };
  await repo.marcarConcluido(uid, `video:${slug}`);
  const ganhou = await repo.lancarMoedas(uid, "video", slug, RECOMPENSAS.video.valor);
  revalidatePath("/", "layout");
  return { moedas: ganhou ? RECOMPENSAS.video.valor : 0 };
}

export async function marcarLido(slug: string) {
  const { uid, repo } = await exigirUsuario();
  if (!AULAS.some((a) => a.slug === slug)) return { moedas: 0 };
  await repo.marcarConcluido(uid, `leitura:${slug}`);
  const ganhou = await repo.lancarMoedas(uid, "leitura", slug, RECOMPENSAS.leitura.valor);
  revalidatePath("/", "layout");
  return { moedas: ganhou ? RECOMPENSAS.leitura.valor : 0 };
}

// Quiz do módulo: a correção acontece no servidor (o navegador não recebe o gabarito antes).
export async function responderQuiz(slugModulo: string, respostas: number[]) {
  const { uid, repo } = await exigirUsuario();
  const modulo = moduloPorSlug(slugModulo);
  if (!modulo || respostas.length !== modulo.quiz.length) return { erro: "Quiz inválido." };
  const correcao = modulo.quiz.map((q, i) => ({ acertou: respostas[i] === q.correta, correta: q.correta, explicacao: q.explicacao }));
  const acertos = correcao.filter((c) => c.acertou).length;
  const aprovado = acertos >= Math.ceil(modulo.quiz.length * (2 / 3));
  let moedas = 0;
  if (aprovado) {
    await repo.marcarConcluido(uid, `quiz:${modulo.slug}`);
    if (await repo.lancarMoedas(uid, "quiz", modulo.slug, RECOMPENSAS.quiz.valor)) moedas = RECOMPENSAS.quiz.valor;
    revalidatePath("/", "layout");
  }
  return { acertos, total: modulo.quiz.length, aprovado, moedas, correcao };
}

export async function desbloquearVideo(slug: string) {
  const { uid, repo } = await exigirUsuario();
  const video = VIDEOS.find((v) => v.slug === slug);
  if (!video?.custo) return { erro: "Este treinamento não precisa ser desbloqueado." };
  const { saldo } = resumoMoedas(await repo.listarMoedas(uid));
  if (saldo < video.custo) return { erro: `Faltam ${video.custo - saldo} coins para desbloquear.` };
  const ok = await repo.lancarMoedas(uid, "desbloqueio", slug, -video.custo);
  revalidatePath("/", "layout");
  return ok ? { ok: true } : { erro: "Você já desbloqueou este treinamento." };
}

// --- Carteira ---------------------------------------------------------------------

const EsquemaPosicao = z.object({
  classe: z.enum(["renda_fixa", "acoes_etfs", "fiis", "multimercado", "cripto", "exterior"]),
  codigo_ou_nome: z.string().trim().min(1, "Informe o nome ou código.").max(80),
  quantidade: z.number().nonnegative().nullable(),
  valor_atual: z.number().positive("Informe um valor maior que zero.").max(1e9),
  data_referencia: z.string().nullable(),
});

const EsquemaImportacao = z.object({
  origem: z.enum(["b3", "pdf", "planilha", "manual"]),
  posicoes: z.array(EsquemaPosicao).min(1, "Adicione pelo menos um investimento.").max(300),
});

export async function confirmarImportacao(dados: unknown) {
  const { uid, repo } = await exigirUsuario();
  const lido = EsquemaImportacao.safeParse(dados);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  const posicoes: Posicao[] = lido.data.posicoes.map((p) => ({ ...p, id: randomUUID() }));
  const ganhos = await registrarCarteira(repo, uid, lido.data.origem, posicoes);
  revalidatePath("/", "layout");
  return { ok: true, ganhos };
}

// Atualiza o valor das posições com código de negociação e quantidade usando a
// cotação da brapi (atraso de até 30 min). Registra um ponto na evolução e as coins.
export async function atualizarCotacoes() {
  const { uid, repo } = await exigirUsuario();
  if (!brapiDisponivel()) return { erro: "Cotações indisponíveis: configure a brapi." };
  const carteira = await repo.obterCarteira(uid);
  if (!carteira?.posicoes.length) return { erro: "Importe uma carteira primeiro." };

  const comCodigo = carteira.posicoes.filter((p) => p.quantidade && extrairTicker(p.codigo_ou_nome) === p.codigo_ou_nome.toUpperCase());
  if (!comCodigo.length) return { erro: "Nenhum investimento com código e quantidade para atualizar." };

  for (const p of comCodigo) revalidateTag(tagAtivo(p.codigo_ou_nome));
  let precos: Awaited<ReturnType<typeof cotacoes>>;
  try {
    precos = await cotacoes(comCodigo.map((p) => p.codigo_ou_nome));
  } catch {
    return { erro: "Não foi possível buscar as cotações agora. Tente mais tarde." };
  }
  const porSimbolo = new Map(precos.map((c) => [c.simbolo, c.preco]));
  const hoje = new Date().toISOString().slice(0, 10);
  let atualizados = 0;
  const posicoes = carteira.posicoes.map((p) => {
    const preco = porSimbolo.get(p.codigo_ou_nome.toUpperCase());
    if (!preco || !p.quantidade) return p;
    atualizados++;
    return { ...p, valor_atual: Math.round(preco * p.quantidade * 100) / 100, data_referencia: hoje };
  });
  const ganhos = await registrarCarteira(repo, uid, carteira.origem, posicoes);
  revalidatePath("/", "layout");
  return { ok: true, atualizados, total: carteira.posicoes.length, ganhos };
}

// Botão "Atualizar" do Mercado e da página do ativo: descarta o cache para a próxima
// leitura buscar na brapi. Limite por pessoa para não esgotar a cota mensal do plano.
export async function atualizarMercado() {
  const { uid } = await exigirUsuario();
  if (!dentroDoLimite(`atualizar-mercado:${uid}`, 1, 60 * 1000)) return { erro: "Aguarde 1 minuto para atualizar de novo." };
  revalidateTag(TAG_MERCADO);
  revalidateTag(tagAtivo("^BVSP"));
  return { ok: true };
}

export async function atualizarAtivo(simbolo: string) {
  const { uid } = await exigirUsuario();
  if (!/^\^?[A-Z0-9]{3,12}$/.test(simbolo)) return { erro: "Ativo inválido." };
  if (!dentroDoLimite(`atualizar-ativo:${uid}`, 4, 60 * 1000)) return { erro: "Aguarde alguns segundos para atualizar de novo." };
  revalidateTag(tagAtivo(simbolo));
  return { ok: true };
}

// Só no modo de teste: carteira fictícia com 4 meses de histórico.
export async function carregarCarteiraExemplo() {
  const { uid, repo, teste } = await exigirUsuario();
  if (!teste) return { erro: "Disponível só no modo de teste." };
  const { posicoes, snapshots } = carteiraExemplo();
  await repo.salvarCarteira(uid, "exemplo", posicoes);
  await substituirSnapshotsTeste(uid, snapshots);
  revalidatePath("/", "layout");
  return { ok: true };
}

// --- Simulador de carteiras -----------------------------------------------------

const EntradaSimulacao = z.object({
  carteira: z.string().max(60),
  valor: z.number().min(0).max(LIMITES.valorMax),
  aporte: z.number().min(0).max(LIMITES.aporteMax),
  meses: z.number().int().min(1).max(600),
});

// Comentário educativo sobre a simulação: feito pela IA quando há chave, senão pelo app.
// Os números são recalculados aqui no servidor com os indicadores do momento.
export async function analisarSimulacao(dados: z.infer<typeof EntradaSimulacao>) {
  const { uid, repo } = await exigirUsuario();
  const lido = EntradaSimulacao.safeParse(dados);
  if (!lido.success) return { erro: "Dados da simulação inválidos." };
  const perfil = await repo.obterPerfil(uid);
  if (!perfil) return { erro: "Faça a entrevista para ver as carteiras de exemplo." };
  const carteira = CARTEIRAS[perfil.estilo].find((c) => c.id === lido.data.carteira);
  if (!carteira) return { erro: "Carteira não encontrada para o seu estilo." };

  const ind = await indicadores();
  const entrada = { valor: lido.data.valor, aporte: lido.data.aporte, meses: lido.data.meses };
  const sim = simular(carteira, entrada, ind);
  const ganhou = await repo.lancarMoedas(uid, "simulacao", "primeira", RECOMPENSAS.simulacao.valor);

  let texto: string | null = null;
  if (iaDisponivel() && dentroDoLimite(`simulacao:${uid}`, 20, 60 * 60 * 1000)) {
    try {
      texto = await comentarSimulacao(resumoParaIA(sim, entrada, ind, perfil.estilo));
    } catch (e) {
      registrarErro("comentário da simulação", e instanceof Error ? e.name : undefined);
    }
  }
  return {
    texto: texto ?? comentarioPadrao(sim, entrada, ind),
    fonte: texto ? ("ia" as const) : ("app" as const),
    moedas: ganhou ? RECOMPENSAS.simulacao.valor : 0,
  };
}
