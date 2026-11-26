/*
 * "hace 3 días", "hace 2 meses": la fecha de una opinión, para leerla de un vistazo. Con la fecha
 * completa en el title, para quien la quiera exacta.
 */

const relative = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' });
const full = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "hace 3 días"; lo de hace menos de un minuto, "ahora". */
export function formatRelativeDate(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'ahora';
}

/** "26 de noviembre de 2026" */
export function formatLongDate(iso: string): string {
  return full.format(new Date(iso));
}

