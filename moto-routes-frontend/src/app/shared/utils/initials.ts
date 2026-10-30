const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });

function firstLetter(word: string): string {
  return segmenter.segment(word)[Symbol.iterator]().next().value?.segment ?? '';
}

/** Iniciales de un nombre: la primera y la última palabra. "Marta Gil Ruiz" es "MR". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';

  const first = firstLetter(words[0] as string);
  const last = words.length > 1 ? firstLetter(words[words.length - 1] as string) : '';
  return `${first}${last}`.toUpperCase();
}
