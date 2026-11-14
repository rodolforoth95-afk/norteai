import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { modoTesteAtivo } from "@/lib/modo-teste";
import { armazemSobre, dadosVazios, type DadosWhatsApp } from "./memoria";
import { armazemSupabase } from "./supabase";

const ARQUIVO = path.join(process.cwd(), ".dados", "whatsapp.json");

const armazemArquivo = armazemSobre(
  async () => {
    try {
      return {
        ...dadosVazios(),
        ...JSON.parse(await readFile(ARQUIVO, "utf8")),
      } as DadosWhatsApp;
    } catch {
      return dadosVazios();
    }
  },
  async (d) => {
    await mkdir(path.dirname(ARQUIVO), { recursive: true });
    await writeFile(ARQUIVO, JSON.stringify(d, null, 2));
  },
);

// No modo de teste local tudo fica em arquivo, inclusive o vínculo com a conta de teste.
export function armazemWhatsApp(teste = modoTesteAtivo()) {
  return teste ? armazemArquivo : armazemSupabase;
}

export type { ArmazemWhatsApp } from "./tipo";
