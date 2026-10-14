/**
 * Prepara un texto para compararlo en una búsqueda: sin mayúsculas, sin tildes y
 * sin espacios de sobra. Así "Logroño" se encuentra escribiendo "logrono".
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Indica si `text` contiene lo que se busca, sin distinguir tildes ni mayúsculas. */
export function matchesQuery(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query));
}
