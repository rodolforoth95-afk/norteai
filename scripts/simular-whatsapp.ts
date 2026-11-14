// Simula o canal do WhatsApp contra o Findomo local: manda uma mensagem assinada ao
// webhook e mostra as respostas, como se tivessem chegado no celular.
// Rodar: npm run simular:whatsapp -- "gastei 85 no almoço"   (o Findomo precisa estar no ar)
// Opções: FINDOMO_URL (padrão http://localhost:3000), TELEFONE (padrão 5511999990000).
import { randomUUID } from "node:crypto";
import { assinar } from "../src/lib/servidor/whatsapp/assinatura";

async function principal() {
  const texto = process.argv.slice(2).join(" ").trim();
  const chave = process.env.WHATSAPP_CHAVE_INTERNA;
  if (!texto || !chave) {
    console.error(
      'Uso: npm run simular:whatsapp -- "mensagem"  (precisa de WHATSAPP_CHAVE_INTERNA no .env.local)',
    );
    process.exit(1);
  }
  const url = (process.env.FINDOMO_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const telefone = process.env.TELEFONE || "5511999990000";
  const corpo = JSON.stringify({
    messageId: randomUUID(),
    telefone,
    jid: `${telefone}@s.whatsapp.net`,
    lid: null,
    nome: "Simulador",
    texto,
    midia: null,
  });
  const timestamp = String(Date.now());
  const r = await fetch(`${url}/api/whatsapp/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-findomo-timestamp": timestamp,
      "x-findomo-assinatura": assinar(chave, timestamp, corpo),
    },
    body: corpo,
  });
  const json = (await r.json().catch(() => ({}))) as {
    respostas?: string[];
    erro?: string;
  };
  console.log(`\nVocê: ${texto}`);
  if (!r.ok)
    return console.log(`(erro ${r.status}: ${json.erro ?? "sem detalhe"})`);
  for (const resposta of json.respostas ?? [])
    console.log(`\nFindomo:\n${resposta}`);
}

principal();
