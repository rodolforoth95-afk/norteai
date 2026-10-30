import { z } from "zod";

// Regras compartilhadas entre o formulário (validação em tempo real) e as rotas de API.

export const REGRA_SENHA = "Mínimo de 8 caracteres, com pelo menos uma letra e um número.";

export const esquemaEmail = z.email("Informe um e-mail válido.").trim().toLowerCase();

export const esquemaSenha = z
  .string()
  .min(8, REGRA_SENHA)
  .max(72, "Use no máximo 72 caracteres.")
  .regex(/[A-Za-zÀ-ÿ]/, REGRA_SENHA)
  .regex(/\d/, REGRA_SENHA);

export const esquemaNome = z
  .string()
  .trim()
  .min(3, "Informe seu nome completo.")
  .max(120, "Use no máximo 120 caracteres.")
  .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome.");

export const esquemaCodigo = z.string().regex(/^\d{6}$/, "O código tem 6 dígitos.");

export function erroDe<T>(esquema: z.ZodType<T>, valor: unknown): string | null {
  const r = esquema.safeParse(valor);
  return r.success ? null : (r.error.issues[0]?.message ?? "Valor inválido.");
}
