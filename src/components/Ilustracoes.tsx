import type { Ilustracao } from "@/lib/conteudo/aulas";

// Ilustrações didáticas das aulas (SVG). Dados fictícios, só para explicar o conceito.

const VERDE = "#22C55E";
const VERMELHO = "#EF4444";
const LARANJA = "#2D5BFF";
const TEXTO = "var(--suave)";

function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-3xl border border-linha bg-superficie p-4">
      <svg viewBox="0 0 320 170" className="w-full [&_text]:fill-suave" role="img" aria-label={titulo}>
        {children}
      </svg>
      <figcaption className="mt-2 text-xs text-suave">{titulo} · exemplo ilustrativo</figcaption>
    </figure>
  );
}

function Candles() {
  return (
    <Moldura titulo="Candle de alta (verde) e de baixa (vermelho)">
      <g>
        <line x1="90" y1="20" x2="90" y2="150" stroke={VERDE} strokeWidth="3" />
        <rect x="70" y="50" width="40" height="70" rx="3" fill={VERDE} />
        <line x1="230" y1="25" x2="230" y2="145" stroke={VERMELHO} strokeWidth="3" />
        <rect x="210" y="45" width="40" height="75" rx="3" fill={VERMELHO} />
      </g>
      <g fill={TEXTO} fontSize="10">
        <text x="118" y="24">máxima</text>
        <text x="118" y="54">fechamento</text>
        <text x="118" y="122">abertura</text>
        <text x="118" y="152">mínima</text>
        <text x="258" y="49">abertura</text>
        <text x="258" y="122">fechamento</text>
      </g>
    </Moldura>
  );
}

function Tendencia() {
  const alta = "10,140 50,110 80,125 120,85 150,100 190,60 220,75 260,35 300,45";
  return (
    <Moldura titulo="Tendência de alta: topos e fundos cada vez mais altos">
      <polyline points={alta} fill="none" stroke={LARANJA} strokeWidth="3" strokeLinejoin="round" />
      <line x1="10" y1="150" x2="300" y2="60" stroke={VERDE} strokeDasharray="5 5" strokeWidth="2" />
      {[["80", "125"], ["150", "100"], ["220", "75"]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="5" fill={VERDE} />
      ))}
      <text x="230" y="150" fill={TEXTO} fontSize="10">fundos ascendentes</text>
    </Moldura>
  );
}

function Suporte() {
  return (
    <Moldura titulo="Suporte (verde) e resistência (vermelho)">
      <rect x="0" y="40" width="320" height="14" fill={VERMELHO} opacity="0.18" />
      <rect x="0" y="118" width="320" height="14" fill={VERDE} opacity="0.18" />
      <polyline points="10,120 45,55 80,122 120,50 160,124 200,52 240,120 280,58 310,90" fill="none" stroke={LARANJA} strokeWidth="3" strokeLinejoin="round" />
      <text x="8" y="34" fill={VERMELHO} fontSize="10">resistência</text>
      <text x="8" y="148" fill={VERDE} fontSize="10">suporte</text>
    </Moldura>
  );
}

function Medias() {
  return (
    <Moldura titulo="Preço (laranja) e média móvel (branca), que suaviza o ruído">
      <polyline points="10,120 30,100 50,115 70,90 90,105 110,80 130,95 150,70 170,85 190,60 210,78 230,55 250,70 270,45 300,60" fill="none" stroke={LARANJA} strokeWidth="2.5" />
      <path d="M10,118 C80,105 140,88 200,72 S280,55 300,52" fill="none" className="stroke-texto" strokeWidth="2.5" strokeDasharray="6 4" />
    </Moldura>
  );
}

function Volume() {
  const barras = [30, 45, 25, 60, 40, 90, 35, 50, 110, 45, 30, 70];
  return (
    <Moldura titulo="Barras de volume: dias com mais negociação se destacam">
      {barras.map((v, i) => (
        <rect key={i} x={12 + i * 25} y={160 - v} width="16" height={v} rx="2" fill={LARANJA} className={v > 80 ? "" : "fill-linha"} />
      ))}
    </Moldura>
  );
}

function Drawdown() {
  return (
    <Moldura titulo="Queda máxima: do topo até o fundo seguinte">
      <polyline points="10,110 50,80 90,40 130,70 170,130 210,120 250,90 300,60" fill="none" stroke={LARANJA} strokeWidth="3" strokeLinejoin="round" />
      <line x1="90" y1="40" x2="90" y2="130" stroke={VERMELHO} strokeDasharray="4 4" />
      <line x1="90" y1="130" x2="170" y2="130" stroke={VERMELHO} strokeDasharray="4 4" />
      <text x="96" y="92" fill={VERMELHO} fontSize="11" fontWeight="bold">−35%</text>
      <circle cx="90" cy="40" r="5" fill={VERDE} />
      <circle cx="170" cy="130" r="5" fill={VERMELHO} />
    </Moldura>
  );
}

function Juros() {
  const pontos = Array.from({ length: 21 }, (_, ano) => {
    const meses = ano * 12;
    const valor = meses ? 200 * ((1.008 ** meses - 1) / 0.008) : 0;
    const aportado = 200 * meses;
    return { x: 15 + ano * 14.5, valor: 155 - (valor / 150000) * 140, aportado: 155 - (aportado / 150000) * 140 };
  });
  return (
    <Moldura titulo="R$ 200/mês a 0,8% ao mês: total (laranja) × valor aportado (cinza)">
      <polyline points={pontos.map((p) => `${p.x},${p.aportado}`).join(" ")} fill="none" className="stroke-suave" strokeWidth="2" strokeDasharray="5 4" />
      <polyline points={pontos.map((p) => `${p.x},${p.valor}`).join(" ")} fill="none" stroke={LARANJA} strokeWidth="3" />
      <text x="230" y="20" fill={LARANJA} fontSize="10">R$ 144 mil</text>
      <text x="250" y="122" fill={TEXTO} fontSize="10">R$ 48 mil</text>
      <text x="15" y="168" fill={TEXTO} fontSize="9">0</text>
      <text x="290" y="168" fill={TEXTO} fontSize="9">20 anos</text>
    </Moldura>
  );
}

const MAPA: Record<Ilustracao, () => React.ReactElement> = {
  candles: Candles,
  tendencia: Tendencia,
  suporte: Suporte,
  medias: Medias,
  volume: Volume,
  drawdown: Drawdown,
  juros: Juros,
};

export function IlustracaoAula({ tipo }: { tipo: Ilustracao }) {
  const Componente = MAPA[tipo];
  return <Componente />;
}
