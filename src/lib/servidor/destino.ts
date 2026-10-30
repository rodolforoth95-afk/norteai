import "server-only";
import { repositorio } from "./repositorio";

// Para onde o usuário vai depois de entrar ou confirmar o e-mail:
// entrevista não concluída → /entrevista; concluída → /inicio.
export async function destinoPosLogin(usuarioId: string, teste = false): Promise<string> {
  try {
    const entrevista = await repositorio(teste).obterEntrevista(usuarioId);
    return entrevista?.concluida ? "/inicio" : "/entrevista";
  } catch {
    return "/entrevista";
  }
}
