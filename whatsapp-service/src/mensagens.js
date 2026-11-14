const fs = require("node:fs");
const path = require("node:path");

// Leitura das mensagens do Baileys e mapa LID ↔ telefone (como no guia do FARO), puro
// o suficiente para os testes.

function criarMapaLid(arquivo) {
  let lidParaTelefone = {};
  try {
    lidParaTelefone = JSON.parse(fs.readFileSync(arquivo, "utf8")).lidParaTelefone || {};
  } catch {
    lidParaTelefone = {};
  }
  return {
    telefoneDe: (lid) => lidParaTelefone[lid] || null,
    gravar(lid, telefoneJid) {
      if (!lid || !telefoneJid || lidParaTelefone[lid] === telefoneJid) return;
      lidParaTelefone[lid] = telefoneJid;
      try {
        fs.mkdirSync(path.dirname(arquivo), { recursive: true });
        fs.writeFileSync(arquivo, JSON.stringify({ lidParaTelefone }));
      } catch {
        // mapa é só otimização; segue sem gravar
      }
    },
  };
}

const ehTelefone = (jid) => typeof jid === "string" && jid.endsWith("@s.whatsapp.net");
const ehLid = (jid) => typeof jid === "string" && jid.endsWith("@lid");
const digitos = (jid) => String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");

// Conversa privada que o Findomo deve atender? Ignora grupos, status, canais, as
// próprias mensagens e eventos sem conteúdo.
function deveAtender(m) {
  const jid = m?.key?.remoteJid || "";
  if (!m?.message || m.key.fromMe) return false;
  if (!(ehTelefone(jid) || ehLid(jid))) return false;
  if (m.message.protocolMessage || m.message.reactionMessage) return false;
  return true;
}

function identificar(m, mapa) {
  const remoto = m.key.remoteJid;
  const alternativo = [m.key.remoteJidAlt, m.key.senderPn].find(ehTelefone) || null;
  const lid = ehLid(remoto) ? remoto : ehLid(m.key.remoteJidAlt) ? m.key.remoteJidAlt : null;
  let telefoneJid = ehTelefone(remoto) ? remoto : alternativo;
  if (!telefoneJid && lid) telefoneJid = mapa.telefoneDe(lid);
  if (lid && telefoneJid) mapa.gravar(lid, telefoneJid);
  const telefone = digitos(telefoneJid || lid || remoto);
  return { jid: remoto, lid, telefone };
}

function conteudo(msg) {
  const m = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg;
  const texto =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.documentMessage?.caption ||
    m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    "";
  const documento = m.documentMessage || m.documentWithCaptionMessage?.message?.documentMessage;
  let midia = null;
  if (m.imageMessage) midia = { tipo: "imagem", mimetype: m.imageMessage.mimetype || "image/jpeg", tamanho: Number(m.imageMessage.fileLength || 0) };
  else if (m.audioMessage) midia = { tipo: "audio", mimetype: m.audioMessage.mimetype || "audio/ogg", tamanho: Number(m.audioMessage.fileLength || 0) };
  else if (documento && /pdf|image\//.test(documento.mimetype || ""))
    midia = { tipo: "documento", mimetype: documento.mimetype, tamanho: Number(documento.fileLength || 0) };
  const naoSuportado = !texto && !midia && Boolean(m.videoMessage || m.stickerMessage || documento || m.contactMessage || m.locationMessage);
  return { texto: String(texto).slice(0, 4000), midia, naoSuportado };
}

module.exports = { criarMapaLid, deveAtender, identificar, conteudo, digitos };
