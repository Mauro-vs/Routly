/** Para comparar sin mayúsculas ni tildes: "Sóller" y "soller" son lo mismo. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Si un texto contiene todas las palabras de la búsqueda, en cualquier orden.
 * "pirineos dificil" encuentra "Pirineos Adventure · Difícil".
 */
export function matchesQuery(text: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(text);
  return words.every((word) => haystack.includes(word));
}

/** Una forma de ordenar un listado. Sin `compare`, el orden de la API. */
export interface ListSort<T> {
  value: string;
  label: string;
  compare?: (a: T, b: T) => number;
}

/** Ordena por un texto, como lo leería una persona: "Ávila" va con la A. */
export function byText<T>(text: (row: T) => string): (a: T, b: T) => number {
  return (a, b) => text(a).localeCompare(text(b), 'es', { sensitivity: 'base' });
}
