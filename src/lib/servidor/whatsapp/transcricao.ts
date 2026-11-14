import "server-only";
import { registrarErro } from "../util";

// Transcrição de áudio (o Claude não ouve áudio). Usa a API de transcrição da OpenAI
// quando OPENAI_API_KEY existe; sem ela, o Mordomo pede para a pessoa escrever.
// O áudio não é guardado: só o texto transcrito entra no histórico.

const MODELO =
  process.env.WHATSAPP_MODELO_TRANSCRICAO || "gpt-4o-mini-transcribe";

export function transcricaoDisponivel() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transcrever(audio: {
  base64: string;
  mimetype: string;
}): Promise<string | null> {
  if (!transcricaoDisponivel()) return null;
  const bytes = Buffer.from(audio.base64, "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return null;
  const tipo = audio.mimetype.split(";")[0] || "audio/ogg";
  const extensao = tipo.includes("mpeg")
    ? "mp3"
    : tipo.includes("mp4")
      ? "m4a"
      : tipo.includes("wav")
        ? "wav"
        : "ogg";
  const corpo = new FormData();
  corpo.append("file", new Blob([bytes], { type: tipo }), `audio.${extensao}`);
  corpo.append("model", MODELO);
  corpo.append("language", "pt");
  corpo.append("response_format", "json");
  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: corpo,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      registrarErro("transcrição", String(r.status));
      return null;
    }
    const json = (await r.json()) as { text?: string };
    return json.text?.trim() || null;
  } catch (e) {
    registrarErro("transcrição", e instanceof Error ? e.name : undefined);
    return null;
  }
}
