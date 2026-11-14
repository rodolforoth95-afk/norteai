const fs = require("node:fs");
const path = require("node:path");

// Configuração só por variáveis de ambiente. Sem valores padrão para segredos:
// sem FINDOMO_URL ou WHATSAPP_CHAVE_INTERNA o serviço não sobe.

function ler() {
  const findomoUrl = (process.env.FINDOMO_URL || "").replace(/\/$/, "");
  const chave = process.env.WHATSAPP_CHAVE_INTERNA || "";
  const erros = [];
  if (!/^https?:\/\//.test(findomoUrl)) erros.push("FINDOMO_URL (ex.: https://findomo.com.br)");
  if (chave.length < 32) erros.push("WHATSAPP_CHAVE_INTERNA (32+ caracteres, a mesma da Vercel)");
  if (erros.length) {
    console.error(`[canal] faltam variáveis: ${erros.join(", ")}`);
    process.exit(1);
  }
  const dados = path.resolve(process.env.DADOS_DIR || path.join(__dirname, "..", "dados"));
  try {
    fs.mkdirSync(dados, { recursive: true });
    fs.accessSync(dados, fs.constants.W_OK);
  } catch {
    console.error(
      `[canal] sem permissão para gravar em ${dados}. No Railway, adicione a variável RAILWAY_RUN_UID=0 e faça um novo deploy.`,
    );
    process.exit(1);
  }
  return {
    findomoUrl,
    chave,
    dados,
    auth: path.join(dados, "auth"),
    portaSaude: Number(process.env.PORTA_SAUDE || 3000),
    nomeAparelho: process.env.NOME_APARELHO || "Findomo",
    intervaloEnvioMs: Math.max(800, Number(process.env.INTERVALO_ENVIO_MS || 1200)),
    tamanhoMaximoMidia: 3 * 1024 * 1024,
  };
}

module.exports = { ler };
