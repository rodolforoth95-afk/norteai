const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHmac } = require("node:crypto");
const { cabecalhos } = require("../src/findomo");
const { criarFila } = require("../src/fila");
const { criarMapaLid, deveAtender, identificar, conteudo } = require("../src/mensagens");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "canal-"));

test("assinatura no formato que o Findomo confere", () => {
  const h = cabecalhos("c".repeat(32), '{"a":1}', 1700000000000);
  assert.equal(h["x-findomo-timestamp"], "1700000000000");
  const esperada = createHmac("sha256", "c".repeat(32)).update('1700000000000.{"a":1}').digest("hex");
  assert.equal(h["x-findomo-assinatura"], esperada);
});

test("só atende conversas privadas", () => {
  const base = { message: { conversation: "oi" } };
  assert.equal(deveAtender({ ...base, key: { remoteJid: "5511999998888@s.whatsapp.net" } }), true);
  assert.equal(deveAtender({ ...base, key: { remoteJid: "123@lid" } }), true);
  assert.equal(deveAtender({ ...base, key: { remoteJid: "1203@g.us" } }), false);
  assert.equal(deveAtender({ ...base, key: { remoteJid: "status@broadcast" } }), false);
  assert.equal(deveAtender({ ...base, key: { remoteJid: "5511999998888@s.whatsapp.net", fromMe: true } }), false);
  assert.equal(deveAtender({ key: { remoteJid: "5511999998888@s.whatsapp.net" } }), false);
});

test("LID vira telefone e o mapa lembra", () => {
  const mapa = criarMapaLid(path.join(tmp(), "lid.json"));
  const a = identificar({ key: { remoteJid: "987654321012345@lid", remoteJidAlt: "5511999998888@s.whatsapp.net" } }, mapa);
  assert.deepEqual(a, { jid: "987654321012345@lid", lid: "987654321012345@lid", telefone: "5511999998888" });
  const b = identificar({ key: { remoteJid: "987654321012345@lid" } }, mapa);
  assert.equal(b.telefone, "5511999998888");
  const c = identificar({ key: { remoteJid: "551188887777@s.whatsapp.net" } }, mapa);
  assert.deepEqual(c, { jid: "551188887777@s.whatsapp.net", lid: null, telefone: "551188887777" });
});

test("extrai texto, legenda e mídia", () => {
  assert.equal(conteudo({ conversation: "gastei 10" }).texto, "gastei 10");
  assert.equal(conteudo({ extendedTextMessage: { text: "oi" } }).texto, "oi");
  const foto = conteudo({ imageMessage: { caption: "almoço", mimetype: "image/jpeg", fileLength: 1000 } });
  assert.equal(foto.texto, "almoço");
  assert.deepEqual(foto.midia, { tipo: "imagem", mimetype: "image/jpeg", tamanho: 1000 });
  assert.equal(conteudo({ audioMessage: { mimetype: "audio/ogg; codecs=opus" } }).midia.tipo, "audio");
  assert.equal(conteudo({ documentMessage: { mimetype: "application/pdf" } }).midia.tipo, "documento");
  assert.equal(conteudo({ stickerMessage: {} }).naoSuportado, true);
  assert.equal(conteudo({ ephemeralMessage: { message: { conversation: "sumindo" } } }).texto, "sumindo");
});

test("fila guarda em disco, repete em falha temporária e mantém a ordem da conversa", async () => {
  const arquivo = path.join(tmp(), "fila.json");
  const vistos = [];
  let falhou = false;
  const fila = criarFila({
    arquivo,
    log: { error() {}, warn() {} },
    async processar(item) {
      if (item.n === 1 && !falhou) {
        falhou = true;
        throw Object.assign(new Error("fora"), { repetir: true });
      }
      vistos.push(item.n);
    },
  });
  fila.adicionar("a", "c1", { n: 1 });
  fila.adicionar("b", "c1", { n: 2 });
  fila.adicionar("a", "c1", { n: 1 });
  assert.equal(JSON.parse(fs.readFileSync(arquivo, "utf8")).length, 2);
  await new Promise((r) => setTimeout(r, 2600));
  fila.parar();
  assert.deepEqual(vistos, [1, 2]);
  assert.equal(fila.tamanho(), 0);
});

test("fila desiste de erro definitivo", async () => {
  const desistiu = [];
  const fila = criarFila({
    arquivo: path.join(tmp(), "fila.json"),
    log: { error() {}, warn() {} },
    async processar() {
      throw Object.assign(new Error("401"), { repetir: false });
    },
    aoDesistir: (d) => desistiu.push(d.n),
  });
  fila.adicionar("x", "c", { n: 7 });
  await new Promise((r) => setTimeout(r, 50));
  fila.parar();
  assert.deepEqual(desistiu, [7]);
});
