import { ImageResponse } from "next/og";

// Ícone PNG do app (PWA e apple-touch-icon): o mascote Findomo em branco sobre o azul-assistente.
export function iconeApp(tamanho: number) {
  const mascote = tamanho * 0.74;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2D5BFF" }}>
        <svg width={mascote} height={mascote} viewBox="0 0 100 100">
          <rect x="14" y="8" width="72" height="56" rx="22" fill="#FFFFFF" />
          <rect x="33" y="24" width="10" height="16" rx="5" fill="#2D5BFF" />
          <rect x="57" y="24" width="10" height="16" rx="5" fill="#2D5BFF" />
          <path d="M28 70 L48 78 L28 86 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="4" strokeLinejoin="round" />
          <path d="M72 70 L52 78 L72 86 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
