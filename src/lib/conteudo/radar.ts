// Radar Findomo: agenda da semana com o que o mercado espera (expectativas) e o que
// aconteceu (fechamentos), mais os vídeos do módulo (boas-vindas e novidades).
// O conteúdo é escrito pela equipe; enquanto as listas estão vazias, a tela mostra
// o espaço reservado de cada parte.

export type CategoriaRadar = "Juros" | "Inflação" | "Emprego" | "Resultados" | "Dividendos" | "Mercado" | "Exterior";
export type Impacto = "alto" | "medio" | "baixo";

export type EventoRadar = {
  id: string;
  data: string; // AAAA-MM-DD
  hora?: string; // HH:MM, horário de Brasília
  tipo: "expectativa" | "fechamento";
  categoria: CategoriaRadar;
  titulo: string;
  resumo: string; // o que é e por que importa, em linguagem simples
  impacto: Impacto;
  esperado?: string; // ex.: "Selic mantida em 13,75%"
  resultado?: string; // preenchido no fechamento
};

export type VideoRadar = {
  slug: string;
  titulo: string;
  descricao: string;
  tipo: "boas-vindas" | "semana" | "fechamento";
  publicado_em: string; // AAAA-MM-DD
  duracao: string; // ex.: "3 min"
  youtubeId: string | null; // id do vídeo no YouTube (embed)
};

export const EVENTOS_RADAR: EventoRadar[] = [];

export const VIDEOS_RADAR: VideoRadar[] = [];

export const CATEGORIAS_RADAR: CategoriaRadar[] = ["Juros", "Inflação", "Emprego", "Resultados", "Dividendos", "Mercado", "Exterior"];

// Vídeos mais recentes primeiro (o Início mostra os primeiros).
export function videosRecentes(quantidade = 3) {
  return [...VIDEOS_RADAR].sort((a, b) => b.publicado_em.localeCompare(a.publicado_em)).slice(0, quantidade);
}
