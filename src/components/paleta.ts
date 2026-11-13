// Paleta dos gráficos da Findomo: azuis da marca, laranja-gravata e tons vizinhos.
// Verde e vermelho ficam só para alta e queda.
export const COR = {
  azul: "#2D5BFF",
  azulMedio: "#5B7FFF",
  azulClaro: "#8FA8FF",
  azulGelo: "#BFCDFF",
  noite: "#1D2F85",
  ceu: "#38BDF8",
  celeste: "#60A5FA",
  laranja: "#FF8A3D",
  pessego: "#FFB27A",
  ambar: "#F5A524",
  lavanda: "#A5B4FC",
  cinza: "#94A3B8",
} as const;

// Ordem para séries sem cor própria (comparações, ativos lado a lado).
export const SERIES = [COR.azul, COR.laranja, COR.ceu, COR.pessego, COR.lavanda, COR.azulClaro, COR.ambar];
