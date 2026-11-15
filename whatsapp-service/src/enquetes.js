const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Enquetes enviadas (o WhatsApp não mostra botões fora da API oficial; a enquete é o
// jeito de o cliente tocar numa opção). Guarda o segredo de cada uma em disco para
// decifrar o voto, que chega cifrado, mesmo depois de um reinício.

const VALIDADE_MS = 2 * 60 * 60 * 1000;

function criarEnquetes(arquivo, agora = () => Date.now()) {
  let dados = {};
  try {
    dados = JSON.parse(fs.readFileSync(arquivo, "utf8")) || {};
  } catch {
    dados = {};
  }
  function gravar() {
    const limite = agora() - VALIDADE_MS;
    for (const [id, e] of Object.entries(dados)) if (e.criadaEm < limite) delete dados[id];
    try {
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, JSON.stringify(dados));
    } catch {
      // sem disco, a enquete ainda vale enquanto o processo estiver de pé
    }
  }
  return {
    guardar(id, enquete) {
      dados[id] = { ...enquete, criadaEm: agora(), respondida: false };
      gravar();
    },
    obter(id) {
      const e = dados[id];
      return e && !e.respondida && e.criadaEm >= agora() - VALIDADE_MS ? e : null;
    },
    concluir(id) {
      if (dados[id]) dados[id].respondida = true;
      gravar();
    },
  };
}

const hashOpcao = (rotulo) => crypto.createHash("sha256").update(Buffer.from(rotulo)).digest("hex");

// Opção escolhida a partir das opções votadas (SHA-256 do texto de cada opção).
function opcaoVotada(enquete, selecionadas) {
  const votos = (selecionadas || []).map((b) => Buffer.from(b).toString("hex"));
  return enquete.opcoes.find((o) => votos.includes(hashOpcao(o.rotulo))) || null;
}

// O voto é cifrado com os jids de quem criou e de quem votou. Com LID e telefone
// convivendo, tenta cada combinação até uma decifrar.
function decifrarVoto({ voto, idEnquete, segredo, criadores, votantes, decifrar }) {
  for (const criador of criadores)
    for (const votante of votantes) {
      try {
        return decifrar(voto, { pollEncKey: segredo, pollCreatorJid: criador, pollMsgId: idEnquete, voterJid: votante });
      } catch {
        // próxima combinação
      }
    }
  return null;
}

function textoAlternativo(enquete) {
  const numeros = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
  return `${enquete.pergunta}\n${enquete.opcoes.map((o, i) => `${numeros[i]} ${o.rotulo}`).join("\n")}\n\nResponda com o número.`;
}

function enqueteValida(e) {
  return (
    e &&
    typeof e.pergunta === "string" &&
    e.pergunta.trim() &&
    Array.isArray(e.opcoes) &&
    e.opcoes.length >= 2 &&
    e.opcoes.length <= 4 &&
    e.opcoes.every((o) => typeof o?.rotulo === "string" && o.rotulo.trim() && ["sim", "nao", "corrigir"].includes(o.valor))
  );
}

module.exports = { criarEnquetes, hashOpcao, opcaoVotada, decifrarVoto, textoAlternativo, enqueteValida };
