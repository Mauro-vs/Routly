import { createHash } from "node:crypto";

/**
 * El JSON de una respuesta de la IA. Aunque se le pida JSON, a veces lo envuelve en ```json ... ```
 * o añade una frase antes: se toma lo que va de la primera { a la última }. null si no hay JSON.
 */
export function extractJson(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Un hash corto y estable de un valor (para las claves de caché). */
export function shortHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url").slice(0, 16);
}
