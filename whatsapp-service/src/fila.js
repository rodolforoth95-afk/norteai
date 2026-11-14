const fs = require("node:fs");
const path = require("node:path");

// Fila de mensagens recebidas, gravada em disco: se o serviço reiniciar ou o Findomo
// estiver fora, nada se perde. Cada conversa é atendida em ordem; conversas diferentes
// andam em paralelo (até "paralelas" ao mesmo tempo).

const ESPERAS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

function criarFila({ arquivo, processar, paralelas = 4, aoDesistir = () => {}, log = console }) {
  let itens = [];
  try {
    itens = JSON.parse(fs.readFileSync(arquivo, "utf8"));
    if (!Array.isArray(itens)) itens = [];
  } catch {
    itens = [];
  }
  const emAndamento = new Set();
  let parada = false;
  let ativos = 0;
  let relogio = null;

  function gravar() {
    try {
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(`${arquivo}.tmp`, JSON.stringify(itens));
      fs.renameSync(`${arquivo}.tmp`, arquivo);
    } catch (e) {
      log.error(`[canal] não gravou a fila: ${e.message}`);
    }
  }

  // A mensagem mais antiga de cada conversa: só ela pode andar, para manter a ordem.
  function primeiros() {
    const vistas = new Set();
    return itens.filter((i) => !vistas.has(i.conversa) && vistas.add(i.conversa));
  }

  function proximo() {
    if (parada) return;
    while (ativos < paralelas) {
      const agora = Date.now();
      const item = primeiros().find((i) => !emAndamento.has(i.conversa) && i.quando <= agora);
      if (!item) break;
      emAndamento.add(item.conversa);
      ativos++;
      rodar(item).finally(() => {
        emAndamento.delete(item.conversa);
        ativos--;
        proximo();
      });
    }
    const espera = primeiros()
      .filter((i) => !emAndamento.has(i.conversa))
      .map((i) => i.quando - Date.now());
    if (relogio) clearTimeout(relogio);
    relogio = espera.length ? setTimeout(proximo, Math.max(200, Math.min(...espera))) : null;
  }

  async function rodar(item) {
    try {
      await processar(item.dados);
      itens = itens.filter((i) => i.id !== item.id);
    } catch (e) {
      item.tentativas = (item.tentativas || 0) + 1;
      if (!e.repetir || item.tentativas > ESPERAS_MS.length) {
        log.error(`[canal] desisti da mensagem ${item.id}: ${e.message}`);
        itens = itens.filter((i) => i.id !== item.id);
        aoDesistir(item.dados, e);
      } else {
        item.quando = Date.now() + ESPERAS_MS[item.tentativas - 1];
        log.warn(`[canal] nova tentativa ${item.tentativas} em ${ESPERAS_MS[item.tentativas - 1] / 1000}s: ${e.message}`);
      }
    }
    gravar();
  }

  return {
    adicionar(id, conversa, dados) {
      if (itens.some((i) => i.id === id)) return;
      itens.push({ id, conversa, dados, quando: Date.now(), tentativas: 0 });
      gravar();
      proximo();
    },
    iniciar: () => proximo(),
    parar() {
      parada = true;
      if (relogio) clearTimeout(relogio);
    },
    tamanho: () => itens.length,
    ativos: () => ativos,
  };
}

module.exports = { criarFila, ESPERAS_MS };
