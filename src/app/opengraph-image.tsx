import { ImageResponse } from "next/og";

// Imagem que aparece ao compartilhar o link no WhatsApp, LinkedIn etc.
export const alt = "Findomo — pode perguntar, estou aqui pra isso";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Nunito (fonte da marca) baixada do Google Fonts; sem rede, usa a fonte padrão.
async function nunito(peso: 800 | 900) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Nunito:wght@${peso}`)).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function ImagemCompartilhamento() {
  const [extra, black] = await Promise.all([nunito(800), nunito(900)]);
  const fonts = [
    ...(extra ? [{ name: "Nunito", data: extra, weight: 800 as const, style: "normal" as const }] : []),
    ...(black ? [{ name: "Nunito", data: black, weight: 900 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: 80,
          background: "linear-gradient(140deg, #14215C 0%, #1D2F85 60%, #2D5BFF 100%)",
          color: "#FFFFFF",
          fontFamily: "Nunito",
        }}
      >
        <svg width="300" height="300" viewBox="0 0 100 100">
          <rect x="18" y="10" width="64" height="52" rx="20" fill="#FFFFFF" />
          <rect x="35" y="26" width="8" height="12" rx="4" fill="#14215C" />
          <rect x="57" y="26" width="8" height="12" rx="4" fill="#14215C" />
          <path d="M40 46 Q50 53 60 46" fill="none" stroke="#14215C" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 68 L47 75 L30 82 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="3" strokeLinejoin="round" />
          <path d="M70 68 L53 75 L70 82 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="50" cy="75" r="5" fill="#FFB27A" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1 }}>
            fin<span style={{ color: "#8FA8FF" }}>domo</span>
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15 }}>Pode perguntar. Estou aqui pra isso.</div>
          <div style={{ fontSize: 28, color: "#C7D2FF" }}>Aprenda a investir, acompanhe o mercado e sua carteira. Sem vender nenhum produto.</div>
          <div style={{ fontSize: 20, color: "#A9B4E0" }}>Conteúdo educacional. Não é recomendação de investimento.</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
