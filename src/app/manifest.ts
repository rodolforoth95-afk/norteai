import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Findomo",
    short_name: "Findomo",
    description:
      "Pode perguntar. Estou aqui pra isso. Seu mordomo das finanças, sem vender nenhum produto.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2D5BFF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
