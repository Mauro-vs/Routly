// Textos de las salidas que comparten la cabecera y la agenda del Dashboard.

const DAY = 24 * 60 * 60 * 1000;

const shortDateFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Días que faltan desde `from` (la última carga, como las cifras de la página). */
export function daysUntil(iso: string, from: Date): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - from.getTime()) / DAY));
}

/** "11 nov, 07:00". */
export function shortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso)).replace('.', '');
}

/** "1 plaza", "8 plazas". */
export function seats(capacity: number): string {
  return `${capacity} ${capacity === 1 ? 'plaza' : 'plazas'}`;
}
