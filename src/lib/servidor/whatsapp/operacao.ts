import "server-only";

// Quem opera o canal (vê o QR para parear e pode desconectar o número do Findomo):
// e-mails em WHATSAPP_OPERADORES, separados por vírgula, ou o login do modo de teste.
export function ehOperadorWhatsApp(email: string, teste: boolean) {
  if (teste) return true;
  const lista = (process.env.WHATSAPP_OPERADORES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && lista.includes(email.toLowerCase());
}

// Número do Findomo, só dígitos com DDI (ex.: 5511999998888), para o link wa.me.
export function numeroWhatsAppFindomo() {
  const n = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D/g, "");
  return n.length >= 12 && n.length <= 15 ? n : null;
}

export function mascararTelefone(t: string) {
  const d = t.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const fim = d.slice(-4);
    return `+55 ${ddd} ••••-${fim}`;
  }
  return `•••• ${d.slice(-4)}`;
}
