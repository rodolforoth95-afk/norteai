import type {
  AcaoPendente,
  ConfigWhatsApp,
  ResumoAdminWhatsApp,
  EntradaRegistrada,
  EstadoCanal,
  StatusMensagem,
  TrocaHistorico,
  Vinculo,
} from "../tipos";

// Dados do WhatsApp. Duas implementações, como o resto do Findomo:
// arquivo local (.dados/whatsapp.json) no modo de teste e Supabase de verdade.
export interface ArmazemWhatsApp {
  vinculoPorTelefone(telefone: string): Promise<Vinculo | null>;
  vinculoPorLid(lid: string): Promise<Vinculo | null>;
  vinculoDoUsuario(usuarioId: string): Promise<Vinculo | null>;
  // Liga o número à conta. Se o número estava em outra conta, ela perde o vínculo.
  vincular(v: Omit<Vinculo, "vinculadoEm">): Promise<void>;
  // Telefone informado no site (cadastro ou conta): fica ligado à conta e é confirmado
  // na primeira conversa. Se outra conta já tem o número, não mexe e devolve "ocupado".
  cadastrarTelefone(
    usuarioId: string,
    telefone: string,
    consentidoEm: string,
  ): Promise<"ok" | "ocupado">;
  confirmarVinculo(
    usuarioId: string,
    dados: { jid: string; lid: string | null; nomeWhatsapp: string | null },
    quando: string,
  ): Promise<void>;
  desvincular(usuarioId: string): Promise<void>;
  alterarAvisos(usuarioId: string, avisos: boolean): Promise<void>;

  // Um código ativo por conta; criar um novo apaga o anterior.
  criarCodigo(
    usuarioId: string,
    codigo: string,
    expiraEm: string,
  ): Promise<void>;
  // Devolve o dono e apaga o código (uso único). Vencido ou inexistente: null.
  consumirCodigo(codigo: string, agora: string): Promise<string | null>;

  registrarEntrada(m: {
    messageId: string;
    usuarioId: string | null;
    telefone: string;
    tipo: "texto" | "imagem" | "audio" | "documento";
    texto: string;
  }): Promise<EntradaRegistrada>;
  atualizarEntrada(
    id: string,
    dados: {
      status: StatusMensagem;
      texto?: string;
      usuarioId?: string | null;
    },
  ): Promise<void>;
  registrarSaidas(m: {
    usuarioId: string | null;
    telefone: string;
    textos: string[];
    respostaDe: string;
  }): Promise<void>;
  respostasDe(entradaId: string): Promise<string[]>;
  historico(
    usuarioId: string,
    desde: string,
    limite: number,
  ): Promise<TrocaHistorico[]>;

  obterPendente(usuarioId: string, agora: string): Promise<AcaoPendente | null>;
  salvarPendente(
    usuarioId: string,
    acao: AcaoPendente,
    expiraEm: string,
  ): Promise<void>;
  limparPendente(usuarioId: string): Promise<void>;

  obterCanal(): Promise<EstadoCanal | null>;
  // Grava o estado informado pelo canal e devolve o comando pendente (e o apaga).
  informarCanal(
    e: Omit<EstadoCanal, "comando" | "atualizadoEm">,
  ): Promise<"desconectar" | null>;
  pedirComando(comando: "desconectar"): Promise<void>;

  obterConfig(): Promise<ConfigWhatsApp>;
  salvarConfig(c: ConfigWhatsApp): Promise<void>;
  resumoAdmin(desde: string): Promise<ResumoAdminWhatsApp>;

  // Retenção: apaga mensagens com mais de 90 dias e códigos vencidos.
  limpar(): Promise<void>;
}
