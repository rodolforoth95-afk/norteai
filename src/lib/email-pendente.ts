// E-mail aguardando verificação, guardado só nesta aba (nunca na URL).
const CHAVE = "norteia:email-verificacao";

export function guardarEmailPendente(email: string) {
  try {
    sessionStorage.setItem(CHAVE, email);
  } catch {}
}

export function lerEmailPendente(): string | null {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function limparEmailPendente() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {}
}

export async function postarJson<T = Record<string, unknown>>(url: string, corpo: unknown) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = (await r.json().catch(() => ({}))) as T & { erro?: string };
    return { ok: r.ok, status: r.status, dados };
  } catch {
    return {
      ok: false,
      status: 0,
      dados: { erro: "Sem conexão. Verifique sua internet e tente de novo." } as T & { erro?: string },
    };
  }
}
