import type {
  Carteira,
  EstadoEntrevista,
  LancamentoMoedas,
  OrigemCarteira,
  Perfil,
  Posicao,
  Snapshot,
} from "@/lib/dominio/tipos";

// Acesso aos dados do usuário. Duas implementações:
// - arquivo local (.dados/teste.json), usada no modo de teste;
// - Supabase, usada de verdade.
export interface Repositorio {
  obterEntrevista(uid: string): Promise<EstadoEntrevista | null>;
  salvarEntrevista(uid: string, estado: EstadoEntrevista): Promise<void>;

  obterPerfil(uid: string): Promise<Perfil | null>;
  salvarPerfil(uid: string, perfil: Omit<Perfil, "versao" | "criado_em">): Promise<Perfil>;

  obterCarteira(uid: string): Promise<Carteira | null>;
  salvarCarteira(uid: string, origem: OrigemCarteira, posicoes: Posicao[]): Promise<Carteira>;

  listarSnapshots(uid: string): Promise<Snapshot[]>;
  adicionarSnapshot(uid: string, snapshot: Snapshot): Promise<void>;

  listarMoedas(uid: string): Promise<LancamentoMoedas[]>;
  // Devolve false se já houver um lançamento com o mesmo tipo e referência.
  lancarMoedas(uid: string, tipo: string, referencia: string, valor: number): Promise<boolean>;

  listarConcluidos(uid: string): Promise<string[]>; // vídeos e conteúdos concluídos
  marcarConcluido(uid: string, chave: string): Promise<void>;

  // Auditoria da IA: só o tipo do evento e a data, nunca o texto da conversa.
  registrarAuditoriaIA(uid: string, tipo: "bloqueio_regulatorio"): Promise<void>;
}
