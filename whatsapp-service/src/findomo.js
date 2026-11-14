const { createHmac } = require("node:crypto");

// Conversa com o Findomo. Toda requisição é assinada: x-findomo-timestamp e
// x-findomo-assinatura = HMAC-SHA256(chave, "timestamp.corpo"). O canal só faz
// chamadas de saída; nenhuma porta precisa ficar aberta na internet.

class ErroFindomo extends Error {
  constructor(mensagem, status, repetir) {
    super(mensagem);
    this.status = status;
    this.repetir = repetir;
  }
}

function cabecalhos(chave, corpo, agora = Date.now()) {
  const timestamp = String(agora);
  const assinatura = createHmac("sha256", chave).update(`${timestamp}.${corpo}`).digest("hex");
  return {
    "content-type": "application/json",
    "x-findomo-timestamp": timestamp,
    "x-findomo-assinatura": assinatura,
  };
}

function criarCliente({ findomoUrl, chave }) {
  async function postar(caminho, dados, timeoutMs) {
    const corpo = JSON.stringify(dados);
    let resposta;
    try {
      resposta = await fetch(`${findomoUrl}${caminho}`, {
        method: "POST",
        headers: cabecalhos(chave, corpo),
        body: corpo,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new ErroFindomo(`rede: ${e.name}`, 0, true);
    }
    if (!resposta.ok) {
      const repetir = resposta.status >= 500 || resposta.status === 429;
      throw new ErroFindomo(`http ${resposta.status}`, resposta.status, repetir);
    }
    return resposta.json();
  }

  return {
    entregarMensagem: (mensagem) => postar("/api/whatsapp/webhook", mensagem, 65_000),
    informarEstado: (estado) => postar("/api/whatsapp/canal", estado, 15_000),
  };
}

module.exports = { criarCliente, cabecalhos, ErroFindomo };
