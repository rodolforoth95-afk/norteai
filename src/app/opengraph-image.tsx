import { ImageResponse } from "next/og";

// Imagem que aparece ao compartilhar o link no WhatsApp, LinkedIn etc.
export const alt = "Norte.ia — seu dinheiro com direção";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagemCompartilhamento() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(150deg, #0A0A0A 0%, #1A0E03 55%, #6B2E00 100%)",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 48 48">
            <polygon points="24,2 28,20 24,24 20,20" fill="#FFFFFF" />
            <polygon points="28,20 46,24 28,28 24,46 20,28 2,24 20,20 24,24" fill="#FF8F00" />
          </svg>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
            norte<span style={{ color: "#FFB020" }}>.ia</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Seu dinheiro com direção.</div>
          <div style={{ fontSize: 32, color: "#BDBDBD" }}>Aprenda a investir, acompanhe o mercado e sua carteira. Sem vender nenhum produto.</div>
        </div>
        <div style={{ fontSize: 22, color: "#8A8A8A" }}>Conteúdo educacional. Não é recomendação de investimento.</div>
      </div>
    ),
    size,
  );
}
