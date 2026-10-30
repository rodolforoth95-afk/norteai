import "server-only";
import { repositorioArquivo } from "./arquivo";
import { repositorioSupabase } from "./supabase";

export function repositorio(teste: boolean) {
  return teste ? repositorioArquivo : repositorioSupabase;
}

export type { Repositorio } from "./tipo";
