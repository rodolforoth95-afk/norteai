// Análise técnica educacional: suportes, resistências, pivôs, médias móveis e
// estatísticas de preço. Serve para estudar como o preço se comportou, nunca para
// indicar compra ou venda. Roda igual no navegador e no servidor.

export type Candle = { data: string; abertura: number; maxima: number; minima: number; fechamento: number; volume: number };

export type TipoNivel = "suporte" | "resistencia";
export type OrigemNivel = "topos-fundos" | "extremo" | "pivo";

export type Nivel = {
  id: string;
  tipo: TipoNivel;
  preco: number;
  origem: OrigemNivel;
  rotulo: string; // ex.: "Suporte 1", "Pivô S1"
  toques: number; // quantas vezes o preço reagiu nessa região
  ultimoToque: string | null;
  forca: "fraca" | "moderada" | "forte";
  distanciaPct: number; // do preço atual até o nível (negativo = abaixo)
};

export const ROTULO_ORIGEM: Record<OrigemNivel, string> = {
  "topos-fundos": "Topos e fundos",
  extremo: "Máxima/mínima do período",
  pivo: "Pivô mensal",
};

// --- Médias e estatísticas -----------------------------------------------------------

export function mediaMovel(candles: Candle[], periodo: number): (number | null)[] {
  let soma = 0;
  return candles.map((c, i) => {
    soma += c.fechamento;
    if (i >= periodo) soma -= candles[i - periodo].fechamento;
    return i >= periodo - 1 ? soma / periodo : null;
  });
}

// Amplitude média (ATR): quanto o preço costuma andar num dia.
export function amplitudeMedia(candles: Candle[], periodo = 14) {
  const trs = candles.map((c, i) => {
    const anterior = i > 0 ? candles[i - 1].fechamento : c.abertura;
    return Math.max(c.maxima - c.minima, Math.abs(c.maxima - anterior), Math.abs(c.minima - anterior));
  });
  const ultimos = trs.slice(-periodo);
  return ultimos.length ? ultimos.reduce((s, v) => s + v, 0) / ultimos.length : 0;
}

export type Estatisticas = {
  retornoPeriodo: number;
  retorno1m: number | null;
  volatilidadeAnual: number; // %
  maiorQueda: number; // % (do topo ao fundo seguinte)
  diasAlta: number; // % dos pregões que fecharam em alta
  maxima: number;
  minima: number;
  volumeMedio: number;
  amplitudeMediaPct: number; // ATR em % do preço
};

export function estatisticas(candles: Candle[]): Estatisticas | null {
  if (candles.length < 2) return null;
  const primeiro = candles[0];
  const ultimo = candles.at(-1)!;
  const retornos = candles.slice(1).map((c, i) => Math.log(c.fechamento / candles[i].fechamento));
  const media = retornos.reduce((s, r) => s + r, 0) / retornos.length;
  const desvio = Math.sqrt(retornos.reduce((s, r) => s + (r - media) ** 2, 0) / Math.max(1, retornos.length - 1));
  let topo = primeiro.fechamento;
  let maiorQueda = 0;
  for (const c of candles) {
    topo = Math.max(topo, c.fechamento);
    maiorQueda = Math.min(maiorQueda, (c.fechamento / topo - 1) * 100);
  }
  const ha1m = candles.length > 21 ? candles[candles.length - 22] : null;
  return {
    retornoPeriodo: (ultimo.fechamento / primeiro.fechamento - 1) * 100,
    retorno1m: ha1m ? (ultimo.fechamento / ha1m.fechamento - 1) * 100 : null,
    volatilidadeAnual: desvio * Math.sqrt(252) * 100,
    maiorQueda,
    diasAlta: (retornos.filter((r) => r > 0).length / retornos.length) * 100,
    maxima: Math.max(...candles.map((c) => c.maxima)),
    minima: Math.min(...candles.map((c) => c.minima)),
    volumeMedio: candles.reduce((s, c) => s + c.volume, 0) / candles.length,
    amplitudeMediaPct: (amplitudeMedia(candles) / ultimo.fechamento) * 100,
  };
}

// --- Suportes e resistências ------------------------------------------------------------

type Pivo = { preco: number; data: string; tipo: "topo" | "fundo" };

// Topos e fundos locais: a máxima (ou mínima) mais extrema numa janela de N pregões para cada lado.
function toposEFundos(candles: Candle[], janela = 3): Pivo[] {
  const pivos: Pivo[] = [];
  for (let i = janela; i < candles.length - janela; i++) {
    const vizinhos = candles.slice(i - janela, i + janela + 1);
    if (candles[i].maxima === Math.max(...vizinhos.map((c) => c.maxima))) pivos.push({ preco: candles[i].maxima, data: candles[i].data, tipo: "topo" });
    if (candles[i].minima === Math.min(...vizinhos.map((c) => c.minima))) pivos.push({ preco: candles[i].minima, data: candles[i].data, tipo: "fundo" });
  }
  return pivos;
}

function forcaPorToques(toques: number): Nivel["forca"] {
  return toques >= 3 ? "forte" : toques === 2 ? "moderada" : "fraca";
}

// Agrupa topos e fundos próximos (dentro da tolerância) numa mesma região de preço.
export function niveisDePreco(candles: Candle[], precoAtual: number, maximoPorLado = 4): Nivel[] {
  if (candles.length < 10) return [];
  const atr = amplitudeMedia(candles);
  const tolerancia = Math.max(precoAtual * 0.012, atr * 0.8);
  const pivos = toposEFundos(candles).sort((a, b) => a.preco - b.preco);

  const grupos: Pivo[][] = [];
  for (const p of pivos) {
    const ultimo = grupos.at(-1);
    if (ultimo && p.preco - ultimo[ultimo.length - 1].preco <= tolerancia) ultimo.push(p);
    else grupos.push([p]);
  }

  const brutos = grupos.map((g) => ({
    preco: g.reduce((s, p) => s + p.preco, 0) / g.length,
    toques: g.length,
    ultimoToque: g.map((p) => p.data).sort().at(-1) ?? null,
    origem: "topos-fundos" as OrigemNivel,
  }));

  // Máxima e mínima do período também são referências, se não coincidirem com um grupo.
  const max = Math.max(...candles.map((c) => c.maxima));
  const min = Math.min(...candles.map((c) => c.minima));
  for (const [preco, data] of [
    [max, candles.find((c) => c.maxima === max)!.data],
    [min, candles.find((c) => c.minima === min)!.data],
  ] as const) {
    if (!brutos.some((b) => Math.abs(b.preco - preco) <= tolerancia)) brutos.push({ preco, toques: 1, ultimoToque: data, origem: "extremo" });
  }

  const abaixo = brutos.filter((b) => b.preco < precoAtual - tolerancia * 0.15).sort((a, b) => b.preco - a.preco).slice(0, maximoPorLado);
  const acima = brutos.filter((b) => b.preco > precoAtual + tolerancia * 0.15).sort((a, b) => a.preco - b.preco).slice(0, maximoPorLado);

  const montar = (b: (typeof brutos)[number], tipo: TipoNivel, i: number): Nivel => ({
    id: `${tipo}-${i + 1}`,
    tipo,
    preco: b.preco,
    origem: b.origem,
    rotulo: `${tipo === "suporte" ? "Suporte" : "Resistência"} ${i + 1}`,
    toques: b.toques,
    ultimoToque: b.ultimoToque,
    forca: forcaPorToques(b.toques),
    distanciaPct: (b.preco / precoAtual - 1) * 100,
  });
  return [...abaixo.map((b, i) => montar(b, "suporte", i)), ...acima.map((b, i) => montar(b, "resistencia", i))];
}

// Pivôs clássicos a partir da máxima, mínima e fechamento do último mês completo.
export function pivosMensais(candles: Candle[], precoAtual: number): Nivel[] {
  const meses = porMes(candles);
  const base = meses.length >= 2 ? meses[meses.length - 2] : null;
  if (!base) return [];
  const { maxima: h, minima: l, fechamento: c } = base;
  const pp = (h + l + c) / 3;
  const pontos: [string, number][] = [
    ["Pivô R2", pp + (h - l)],
    ["Pivô R1", 2 * pp - l],
    ["Pivô central", pp],
    ["Pivô S1", 2 * pp - h],
    ["Pivô S2", pp - (h - l)],
  ];
  return pontos.map(([rotulo, preco]) => ({
    id: `pivo-${rotulo.split(" ").at(-1)!.toLowerCase()}`,
    tipo: preco < precoAtual ? "suporte" : "resistencia",
    preco,
    origem: "pivo",
    rotulo,
    toques: 0,
    ultimoToque: null,
    forca: "moderada",
    distanciaPct: (preco / precoAtual - 1) * 100,
  }));
}

// --- Mês a mês ---------------------------------------------------------------------------

export type Mes = {
  mes: string; // AAAA-MM
  abertura: number;
  fechamento: number;
  maxima: number;
  minima: number;
  variacaoPct: number; // contra o fechamento do mês anterior (no primeiro, contra a abertura)
  amplitudePct: number; // da mínima à máxima do mês
  volume: number;
  pregoes: number;
  parcial: boolean; // mês em andamento ou que começou no meio do histórico
};

export function porMes(candles: Candle[], hoje = new Date().toISOString().slice(0, 10)): Mes[] {
  const grupos = new Map<string, Candle[]>();
  for (const c of candles) {
    const m = c.data.slice(0, 7);
    grupos.set(m, [...(grupos.get(m) ?? []), c]);
  }
  const meses: Mes[] = [];
  let fechamentoAnterior: number | null = null;
  [...grupos.entries()].forEach(([mes, lista], i) => {
    const abertura = lista[0].abertura;
    const fechamento = lista.at(-1)!.fechamento;
    const maxima = Math.max(...lista.map((c) => c.maxima));
    const minima = Math.min(...lista.map((c) => c.minima));
    const base: number = fechamentoAnterior ?? abertura;
    meses.push({
      mes,
      abertura,
      fechamento,
      maxima,
      minima,
      variacaoPct: (fechamento / base - 1) * 100,
      amplitudePct: (maxima / minima - 1) * 100,
      volume: lista.reduce((s, c) => s + c.volume, 0),
      pregoes: lista.length,
      parcial: mes === hoje.slice(0, 7) || (i === 0 && Number(lista[0].data.slice(8, 10)) > 7),
    });
    fechamentoAnterior = fechamento;
  });
  return meses;
}

// Fechamentos normalizados em base 100 (para comparar ativos de preços diferentes).
export function base100(pontos: { data: string; fechamento: number }[]) {
  const inicial = pontos[0]?.fechamento;
  return pontos.map((p) => ({ data: p.data, valor: inicial ? (p.fechamento / inicial) * 100 : 100 }));
}

// --- Leituras educativas -------------------------------------------------------------------

export type Leitura = { id: string; titulo: string; texto: string; tom: "neutro" | "atencao" | "positivo" | "negativo"; aula: string };

const pct = (v: number, casas = 1) => `${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;

// Observações para estudo. Descrevem o que aconteceu com o preço e o que analistas
// técnicos costumam observar nessa situação, sem dizer o que fazer.
export function leiturasEducativas(candles: Candle[], niveis: Nivel[], precoAtual: number, brl: (v: number) => string = reais): Leitura[] {
  const leituras: Leitura[] = [];
  if (candles.length < 22) return leituras;
  const est = estatisticas(candles)!;
  const mm9 = mediaMovel(candles, 9).at(-1);
  const mm21 = mediaMovel(candles, 21).at(-1);
  const mm9Antes = mediaMovel(candles, 9).at(-6);
  const mm21Antes = mediaMovel(candles, 21).at(-6);

  const suporte = niveis.filter((n) => n.tipo === "suporte" && n.origem !== "pivo").sort((a, b) => b.preco - a.preco)[0];
  const resistencia = niveis.filter((n) => n.tipo === "resistencia" && n.origem !== "pivo").sort((a, b) => a.preco - b.preco)[0];

  if (suporte && Math.abs(suporte.distanciaPct) <= 3) {
    leituras.push({
      id: "perto-suporte",
      titulo: `Preço a ${pct(suporte.distanciaPct)} de um suporte`,
      texto: `Na região de ${brl(suporte.preco)} o preço parou de cair ${suporte.toques === 1 ? "uma vez" : `${suporte.toques} vezes`} no período. Quem estuda análise técnica observa se o preço respeita a região (volta a subir) ou a rompe para baixo. Nenhum dos dois é garantido.`,
      tom: "atencao",
      aula: "suporte-resistencia",
    });
  }
  if (resistencia && Math.abs(resistencia.distanciaPct) <= 3) {
    leituras.push({
      id: "perto-resistencia",
      titulo: `Preço a ${pct(resistencia.distanciaPct)} de uma resistência`,
      texto: `Na região de ${brl(resistencia.preco)} o preço parou de subir ${resistencia.toques === 1 ? "uma vez" : `${resistencia.toques} vezes`}. Analistas observam se há força (volume) para atravessar a região ou se o preço recua de novo.`,
      tom: "atencao",
      aula: "suporte-resistencia",
    });
  }

  const maxAnterior = Math.max(...candles.slice(0, -1).map((c) => c.maxima));
  const minAnterior = Math.min(...candles.slice(0, -1).map((c) => c.minima));
  if (precoAtual > maxAnterior) {
    leituras.push({
      id: "rompeu-maxima",
      titulo: "Fechou acima da máxima do período",
      texto: "Quando o preço passa da maior máxima recente, a antiga resistência pode virar suporte. É uma das ideias mais estudadas em análise técnica, e rompimentos falsos também são comuns.",
      tom: "positivo",
      aula: "suporte-resistencia",
    });
  } else if (precoAtual < minAnterior) {
    leituras.push({
      id: "rompeu-minima",
      titulo: "Fechou abaixo da mínima do período",
      texto: "Quando o preço perde a menor mínima recente, o antigo suporte pode virar resistência. Vale estudar o contexto (notícias, resultados, setor) antes de tirar conclusões.",
      tom: "negativo",
      aula: "suporte-resistencia",
    });
  }

  if (mm9 && mm21 && mm9Antes && mm21Antes) {
    const cruzouParaCima = mm9Antes <= mm21Antes && mm9 > mm21;
    const cruzouParaBaixo = mm9Antes >= mm21Antes && mm9 < mm21;
    if (cruzouParaCima || cruzouParaBaixo) {
      leituras.push({
        id: "cruzamento-medias",
        titulo: `Média de 9 dias cruzou a de 21 para ${cruzouParaCima ? "cima" : "baixo"}`,
        texto: `Cruzamentos de médias móveis mostram mudança no ritmo dos preços recentes. São sinais atrasados (usam o passado) e geram muitos alarmes falsos em mercados sem tendência.`,
        tom: cruzouParaCima ? "positivo" : "negativo",
        aula: "medias-moveis",
      });
    } else {
      const acima = precoAtual > mm21;
      leituras.push({
        id: "tendencia-curta",
        titulo: `Preço ${acima ? "acima" : "abaixo"} da média de 21 dias`,
        texto: `A média de 21 pregões (cerca de um mês) está em ${brl(mm21)}. Estar ${acima ? "acima" : "abaixo"} dela costuma ser lido como tendência de curto prazo de ${acima ? "alta" : "baixa"}, o que pode mudar rápido.`,
        tom: acima ? "positivo" : "negativo",
        aula: "tendencias",
      });
    }
  }

  const ultimo = candles.at(-1)!;
  if (est.volumeMedio > 0 && ultimo.volume > est.volumeMedio * 1.8) {
    leituras.push({
      id: "volume-alto",
      titulo: `Volume ${(ultimo.volume / est.volumeMedio).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× acima da média`,
      texto: "Muito mais ações trocaram de mãos que o normal. Volume alto costuma acompanhar notícias e dá mais peso ao movimento do dia na leitura técnica.",
      tom: "neutro",
      aula: "volume",
    });
  }

  leituras.push({
    id: "volatilidade",
    titulo: `Oscilação de ${pct(est.volatilidadeAnual, 0)} ao ano`,
    texto: `Em média, o preço andou ${pct(est.amplitudeMediaPct)} por dia entre a mínima e a máxima. A maior queda do topo ao fundo no período foi de ${pct(est.maiorQueda)}. Ativos mais voláteis exigem mais estômago e prazo.`,
    tom: "neutro",
    aula: "volatilidade",
  });
  return leituras;
}

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
