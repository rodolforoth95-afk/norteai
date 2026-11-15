const { test } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { decryptPollVote, proto } = require("@whiskeysockets/baileys");
const { criarEnquetes, hashOpcao, opcaoVotada, decifrarVoto, textoAlternativo, enqueteValida } = require("../src/enquetes");

const ENQUETE = {
  pergunta: "Posso salvar?",
  opcoes: [
    { rotulo: "✅ Confirmar", valor: "sim" },
    { rotulo: "❌ Cancelar", valor: "nao" },
    { rotulo: "✏️ Corrigir", valor: "corrigir" },
  ],
};

// Cifra um voto como o WhatsApp faz (inverso do decryptPollVote do Baileys).
function cifrarVoto({ segredo, idEnquete, criador, votante, rotulo }) {
  const hmac = (dados, chave) => crypto.createHmac("sha256", chave).update(dados).digest();
  const sign = Buffer.concat([Buffer.from(idEnquete), Buffer.from(criador), Buffer.from(votante), Buffer.from("Poll Vote"), Buffer.from([1])]);
  const chave = hmac(sign, hmac(segredo, Buffer.alloc(32)));
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave, iv);
  cifra.setAAD(Buffer.from(`${idEnquete}\u0000${votante}`));
  const corpo = proto.Message.PollVoteMessage.encode({ selectedOptions: [crypto.createHash("sha256").update(rotulo).digest()] }).finish();
  const enc = Buffer.concat([cifra.update(corpo), cifra.final(), cifra.getAuthTag()]);
  return { encPayload: enc, encIv: iv };
}

test("decifra o voto real e acha a opção, mesmo com LID e telefone misturados", () => {
  const segredo = crypto.randomBytes(32);
  const voto = cifrarVoto({ segredo, idEnquete: "ABC", criador: "111@lid", votante: "5511999998888@s.whatsapp.net", rotulo: "❌ Cancelar" });
  const decifrado = decifrarVoto({
    voto,
    idEnquete: "ABC",
    segredo,
    criadores: ["5511900000000@s.whatsapp.net", "111@lid"],
    votantes: ["222@lid", "5511999998888@s.whatsapp.net"],
    decifrar: decryptPollVote,
  });
  assert.ok(decifrado);
  assert.strictEqual(opcaoVotada(ENQUETE, decifrado.selectedOptions).valor, "nao");
});

test("voto com segredo errado não decifra", () => {
  const voto = cifrarVoto({ segredo: crypto.randomBytes(32), idEnquete: "X", criador: "a@lid", votante: "b@lid", rotulo: "✅ Confirmar" });
  assert.strictEqual(decifrarVoto({ voto, idEnquete: "X", segredo: crypto.randomBytes(32), criadores: ["a@lid"], votantes: ["b@lid"], decifrar: decryptPollVote }), null);
});

test("desmarcar (nenhuma opção) não vira resposta", () => {
  assert.strictEqual(opcaoVotada(ENQUETE, []), null);
  assert.strictEqual(opcaoVotada(ENQUETE, [Buffer.from(hashOpcao("outra"), "hex")]), null);
});

test("guarda em disco, vale uma vez e expira", () => {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "enq-")), "enquetes.json");
  let agora = 1_000_000;
  const e = criarEnquetes(arquivo, () => agora);
  e.guardar("ID1", { segredo: "x", opcoes: ENQUETE.opcoes, jid: "j" });
  assert.ok(criarEnquetes(arquivo, () => agora).obter("ID1"), "sobrevive a reinício");
  e.concluir("ID1");
  assert.strictEqual(e.obter("ID1"), null, "só o primeiro voto vale");
  e.guardar("ID2", { segredo: "x", opcoes: ENQUETE.opcoes, jid: "j" });
  agora += 3 * 60 * 60 * 1000;
  assert.strictEqual(e.obter("ID2"), null, "vence em 2 h");
});

test("valida a enquete do Findomo e tem texto alternativo numerado", () => {
  assert.ok(enqueteValida(ENQUETE));
  assert.ok(!enqueteValida({ pergunta: "x", opcoes: [{ rotulo: "a", valor: "apagar tudo" }, { rotulo: "b", valor: "sim" }] }));
  assert.ok(!enqueteValida(null));
  assert.match(textoAlternativo(ENQUETE), /1️⃣ ✅ Confirmar\n2️⃣ ❌ Cancelar/);
});
