/*
 * Formatos de la web pública. Los del panel (format.ts) son para una herramienta: "1.250,00 €",
 * "30 sept 2026, 10:00". Aquí, para leer de un vistazo: "89 €", "20 nov", "4 h".
 */

const LOCALE = 'es-ES';
const ZONE = 'Europe/Madrid';

// Dos formatos: sin decimales para los precios redondos, y con los dos de los céntimos si los hay
// (un solo decimal, "149,5 €", se lee como un error)
const wholePrice = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const centsPrice = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: ZONE });
const weekdayDate = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONE });
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: ZONE });
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** 89 → "89 €"; 149.5 → "149,50 €" */
export function formatPrice(value: number): string {
  return (Number.isInteger(value) ? wholePrice : centsPrice).format(value);
}

/** "20 nov" (sin el punto de la abreviatura) */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso)).replace('.', '');
}

/** "jue, 20 nov" */
export function formatWeekdayDate(iso: string): string {
  return weekdayDate.format(new Date(iso)).replaceAll('.', '');
}

/** "08:00", en la hora de la península (la de las salidas) */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** 4 → "4 h"; 1.5 → "1,5 h" */
export function formatHours(hours: number): string {
  return `${number.format(hours)} h`;
}

/**
 * Una cifra en español: 1284 → "1284" (con cuatro cifras no se separa), 12840 → "12.840".
 * Hasta un decimal: 1,5.
 */
export function formatNumber(value: number): string {
  return number.format(value);
}

/** Los km de una ruta, como cualquier cifra: 180 → "180"; 4800 → "4800" */
export const formatKm = formatNumber;

/** "1 experiencia", "6 experiencias" */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
