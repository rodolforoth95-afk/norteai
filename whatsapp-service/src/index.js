const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const pino = require("pino");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const { ler } = require("./config");
const { criarCliente } = require("./findomo");
const { criarFila } = require("./fila");
const { criarMapaLid, deveAtender, identificar, conteudo, digitos } = require("./mensagens");

// Canal WhatsApp do Findomo. Mantém a sessão do número (Baileys), põe cada mensagem
// recebida numa fila em disco, entrega ao Findomo (webhook assinado) e envia as
// respostas. Também informa o próprio estado (QR para parear, conectado) ao Findomo.

const config = ler();
const log = pino({ level: process.env.LOG_NIVEL || "info" });
const silencioso = pino({ level: "silent" });
const findomo = criarCliente(config);
const mapa = criarMapaLid(path.join(config.dados, "lid.json"));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let sock = null;
let estado = { status: "iniciando", qr: null, numero: null, nome: null };
let tentativas = 0;
let encerrando = false;

const AVISO_INDISPONIVEL =
  "Estou com uma instabilidade e não consegui responder agora. Pode mandar de novo em alguns minutos?";
const AVISO_NAO_SUPORTADO =
  "Por aqui eu entendo texto, áudio, foto e PDF de comprovantes. Pode me mandar assim?";
const AVISO_GRANDE = "Esse arquivo é grande demais para mim. Pode mandar uma foto menor ou escrever o lançamento?";

async function enviar(jid, textos) {
  for (const texto of textos) {
    if (!sock || estado.status !== "conectado") throw Object.assign(new Error("desconectado"), { repetir: true });
    await sock.sendMessage(jid, { text: texto });
    await espera(config.intervaloEnvioMs);
  }
}

const fila = criarFila({
  arquivo: path.join(config.dados, "fila.json"),
  log,
  async processar(item) {
    if (item.respostaLocal) return enviar(item.jid, [item.respostaLocal]);
    await sock?.sendPresenceUpdate("composing", item.jid).catch(() => {});
    const { respostas } = await findomo.entregarMensagem(item.mensagem);
    await sock?.sendPresenceUpdate("paused", item.jid).catch(() => {});
    await enviar(item.jid, Array.isArray(respostas) ? respostas.filter((t) => typeof t === "string" && t.trim()) : []);
  },
  aoDesistir(item) {
    if (sock && estado.status === "conectado") sock.sendMessage(item.jid, { text: AVISO_INDISPONIVEL }).catch(() => {});
  },
});

async function informar(mudanca = {}) {
  estado = { ...estado, ...mudanca };
  try {
    const r = await findomo.informarEstado(estado);
    if (r?.comando === "desconectar") await desconectar();
  } catch (e) {
    log.warn(`[canal] não informou o estado ao Findomo: ${e.message}`);
  }
}

function limparSessao() {
  fs.rmSync(config.auth, { recursive: true, force: true });
  fs.mkdirSync(config.auth, { recursive: true });
}

async function desconectar() {
  log.info("[canal] desconexão pedida pelo Findomo");
  try {
    await sock?.logout();
  } catch {
    limparSessao();
    setTimeout(iniciar, 2000);
  }
}

async function receber(m) {
  if (!deveAtender(m)) return;
  const idade = Date.now() / 1000 - Number(m.messageTimestamp || 0);
  if (idade > 24 * 60 * 60) return;
  const { jid, lid, telefone } = identificar(m, mapa);
  if (!/^\d{10,15}$/.test(telefone)) return;
  const { texto, midia, naoSuportado } = conteudo(m.message);
  const id = m.key.id;
  if (naoSuportado) return fila.adicionar(id, jid, { jid, respostaLocal: AVISO_NAO_SUPORTADO });
  if (!texto && !midia) return;
  if (midia && midia.tamanho > config.tamanhoMaximoMidia) return fila.adicionar(id, jid, { jid, respostaLocal: AVISO_GRANDE });

  let midiaBase64 = null;
  if (midia) {
    try {
      const buffer = await downloadMediaMessage(m, "buffer", {}, { logger: silencioso, reuploadRequest: sock.updateMediaMessage });
      if (buffer.length > config.tamanhoMaximoMidia) return fila.adicionar(id, jid, { jid, respostaLocal: AVISO_GRANDE });
      midiaBase64 = { tipo: midia.tipo, mimetype: midia.mimetype, base64: buffer.toString("base64") };
    } catch (e) {
      log.warn(`[canal] não baixou a mídia: ${e.message}`);
      if (!texto) return fila.adicionar(id, jid, { jid, respostaLocal: "Não consegui abrir esse arquivo. Pode mandar de novo?" });
    }
  }
  fila.adicionar(id, jid, {
    jid,
    mensagem: { messageId: id, telefone, jid, lid, nome: (m.pushName || "").slice(0, 120), texto, midia: midiaBase64 },
  });
}

async function iniciar() {
  if (encerrando) return;
  fs.mkdirSync(config.auth, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(config.auth);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({
    ...(version ? { version } : {}),
    logger: silencioso,
    auth: state,
    browser: [config.nomeAparelho, "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      log.info("[canal] leia o QR abaixo (ou na tela Conta › WhatsApp do Findomo):");
      console.log(await QRCode.toString(qr, { type: "terminal", small: true }));
      await informar({ status: "qr", qr: await QRCode.toDataURL(qr, { margin: 2, scale: 7 }) });
    }
    if (connection === "open") {
      tentativas = 0;
      const numero = digitos(sock.user?.id);
      log.info(`[canal] conectado como ${numero.slice(0, 4)}…${numero.slice(-2)}`);
      await informar({ status: "conectado", qr: null, numero, nome: sock.user?.name || sock.user?.notify || null });
      fila.iniciar();
    }
    if (connection === "close") {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      if (encerrando) return;
      if (codigo === DisconnectReason.loggedOut) {
        log.warn("[canal] sessão encerrada no celular; gerando novo QR");
        limparSessao();
        await informar({ status: "desconectado", qr: null, numero: null, nome: null });
        setTimeout(iniciar, 3000);
        return;
      }
      tentativas++;
      const ms = Math.min(2 ** Math.min(tentativas, 5) * 1000, 30_000);
      log.warn(`[canal] conexão caiu (${codigo ?? "?"}); nova tentativa em ${ms / 1000}s`);
      await informar({ status: "conectando", qr: null });
      setTimeout(() => iniciar().catch((e) => log.error(e)), ms);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) await receber(m).catch((e) => log.error(`[canal] erro ao receber: ${e.message}`));
  });
}

const saude = http.createServer((req, res) => {
  if (req.url !== "/saude") {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: estado.status, fila: fila.tamanho() }));
});

async function encerrar(sinal) {
  if (encerrando) return;
  encerrando = true;
  log.info(`[canal] ${sinal}: encerrando`);
  fila.parar();
  for (let i = 0; i < 20 && fila.ativos() > 0; i++) await espera(500);
  saude.close();
  sock?.end(undefined);
  process.exit(0);
}

process.on("SIGTERM", () => encerrar("SIGTERM"));
process.on("SIGINT", () => encerrar("SIGINT"));

saude.listen(config.portaSaude, "0.0.0.0", () => log.info(`[canal] saúde em :${config.portaSaude}/saude`));
setInterval(() => informar(), 30_000).unref();
iniciar().catch((e) => {
  log.error(`[canal] falha ao iniciar: ${e.message}`);
  setTimeout(iniciar, 5000);
});
