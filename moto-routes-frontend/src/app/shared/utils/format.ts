const LOCALE = 'es-ES';

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const moneyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR' });
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' });

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 1782.5 se muestra como "1.782,5". Como mucho, dos decimales. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Fecha corta, por ejemplo "30 sept 2026". */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Fecha con la hora, por ejemplo "30 sept 2026, 10:00". En la hora local. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Precio en euros, por ejemplo "1.250,00 €". */
export function formatMoney(value: number): string {
  return moneyFormat.format(value);
}

/** Tiempo transcurrido, por ejemplo "hace 2 h" o "ayer". Pasado un mes, la fecha. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const elapsed = Math.abs(seconds);

  if (elapsed < MINUTE) return 'ahora mismo';
  if (elapsed < HOUR) return relativeFormat.format(Math.round(seconds / MINUTE), 'minute');
  if (elapsed < DAY) return relativeFormat.format(Math.round(seconds / HOUR), 'hour');
  if (elapsed < 30 * DAY) return relativeFormat.format(Math.round(seconds / DAY), 'day');
  return formatDate(iso);
}
