import { randomInt } from "node:crypto";
import { madridDateParts } from "./dates.js";

// Crockford Base32: sin I, L, O ni U, para que el código se pueda leer y dictar sin errores
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// RTL-<tipo>-AAMMDD-XXXXX. Ejemplo: RTL-DEP-261108-7QX2M
export const SKU_PATTERN = /^RTL-[A-Z]{3}-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/;

// La fecha es la del alta (hora de Madrid): el SKU no cambia nunca, así que no puede
// llevar un dato que se edite después, como la fecha de salida
export function buildSku(productType, date = new Date()) {
  const { year, month, day } = madridDateParts(date);
  const code = Array.from({ length: 5 }, () => CROCKFORD[randomInt(CROCKFORD.length)]).join("");
  return `RTL-${productType}-${year.slice(-2)}${month}${day}-${code}`;
}
