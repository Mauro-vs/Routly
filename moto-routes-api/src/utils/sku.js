import { randomInt } from "node:crypto";

// Crockford Base32: sin I, L, O ni U, para que el código se pueda leer y dictar sin errores
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// RTL-<tipo>-AAMMDD-XXXXX. Ejemplo: RTL-DEP-261108-7QX2M
export const SKU_PATTERN = /^RTL-[A-Z]{3}-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/;

const madridDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Fecha en hora de Madrid, no en UTC: { year: "2026", month: "11", day: "08" }
export function madridDateParts(date) {
  return Object.fromEntries(madridDate.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function buildSku(productType, date) {
  const { year, month, day } = madridDateParts(date);
  const code = Array.from({ length: 5 }, () => CROCKFORD[randomInt(CROCKFORD.length)]).join("");
  return `RTL-${productType}-${year.slice(-2)}${month}${day}-${code}`;
}
