import type { Meio, TipoLancamento } from "@/lib/dominio/financas";

// Mensagem como o canal (serviço Baileys) entrega ao Findomo.
export type MidiaCanal = {
  tipo: "imagem" | "audio" | "documento";
  mimetype: string;
  base64: string;
};

export type MensagemCanal = {
  messageId: string;
  telefone: string;
  jid: string;
  lid: string | null;
  nome: string;
  texto: string;
  midia: MidiaCanal | null;
};

// Pergunta com opções que o canal envia como enquete do WhatsApp. O voto volta ao
// Findomo como uma mensagem comum com o texto de "valor" (ex.: "sim").
export type EnqueteSaida = {
  pergunta: string;
  opcoes: { rotulo: string; valor: "sim" | "nao" | "corrigir" }[];
};

export type Vinculo = {
  usuarioId: string;
  telefone: string;
  lid: string | null;
  jid: string;
  nomeWhatsapp: string | null;
  avisos: boolean;
  consentidoEm: string;
  vinculadoEm: string;
  confirmadoEm: string | null;
};

export type ConfigWhatsApp = {
  atendimento: boolean;
  mensagemPausa: string | null;
};

export type ClienteWhatsApp = {
  usuarioId: string;
  nome: string | null;
  telefone: string;
  vinculadoEm: string;
  confirmado: boolean;
};

export type ResumoAdminWhatsApp = {
  ligados: number;
  aguardando: number;
  mensagensHoje: number;
  clientes: ClienteWhatsApp[];
};

export type LancamentoProposto = {
  tipo: TipoLancamento;
  valor: number;
  data: string;
  descricao: string;
  estabelecimento: string | null;
  meio: Meio | null;
  parcelas: number;
  categoriaId: string;
};

export type AcaoPendente =
  | { tipo: "lancar"; lancamento: LancamentoProposto }
  | { tipo: "apagar"; lancamentoId: string; resumo: string }
  | { tipo: "desvincular" };

export type EntradaRegistrada = {
  id: string;
  novo: boolean;
  status: StatusMensagem;
  criadoEm: string;
};

export type StatusMensagem =
  "recebida" | "processando" | "respondida" | "erro" | "enviada";

export type TrocaHistorico = {
  direcao: "entrada" | "saida";
  texto: string;
  criadoEm: string;
};

export type EstadoCanal = {
  status: string;
  qr: string | null;
  numero: string | null;
  nome: string | null;
  comando: "desconectar" | null;
  atualizadoEm: string;
};
