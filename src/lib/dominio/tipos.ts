// Tipos do domínio, compartilhados entre o navegador e o servidor.

export type Estilo = "Cauteloso" | "Equilibrado" | "Ousado";

export type Classe =
  | "renda_fixa"
  | "acoes_etfs"
  | "fiis"
  | "multimercado"
  | "cripto"
  | "exterior";

export type Risco = "Baixo" | "Médio" | "Alto" | "Muito alto";

export type CampoEntrevista =
  | "objetivo_principal"
  | "horizonte"
  | "patrimonio_faixa"
  | "sobra_mensal_faixa"
  | "tem_divida_cara"
  | "reserva_meses"
  | "reacao_queda"
  | "nivel_declarado"
  | "caminho";

export type Respostas = Partial<Record<CampoEntrevista, string>>;

export type EstadoEntrevista = {
  respostas: Respostas;
  concluida: boolean;
  atualizada_em: string;
};

export type Perfil = {
  versao: number;
  respostas: Required<Respostas>;
  pontuacao: number;
  estilo: Estilo;
  travado: boolean;
  criado_em: string;
};

export type Posicao = {
  id: string;
  classe: Classe;
  codigo_ou_nome: string;
  quantidade: number | null;
  valor_atual: number;
  data_referencia: string | null;
};

export type OrigemCarteira = "b3" | "pdf" | "planilha" | "manual" | "exemplo";

export type Carteira = {
  origem: OrigemCarteira;
  atualizada_em: string;
  posicoes: Posicao[];
};

export type Snapshot = {
  data: string; // ISO
  total: number;
  por_classe: Record<Classe, number>;
};

export type LancamentoMoedas = {
  tipo: string;
  referencia: string;
  valor: number;
  criado_em: string;
};
