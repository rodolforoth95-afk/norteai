import { ImageResponse } from "next/og";

// Ícone PNG do app (PWA e apple-touch-icon), desenhado a partir do símbolo da estrela-guia.
export function iconeApp(tamanho: number) {
  const estrela = tamanho * 0.72;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <svg width={estrela} height={estrela} viewBox="0 0 48 48">
          <polygon points="24,2 28,20 24,24 20,20" fill="#FFFFFF" />
          <polygon
            points="28,20 46,24 28,28 24,46 20,28 2,24 20,20 24,24"
            fill="#FF8F00"
          />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
